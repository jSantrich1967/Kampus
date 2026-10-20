/**
 * Foto de perfil: reglas de validación y utilidades.
 * La foto vive en el bucket público `avatars`, en la carpeta del propio
 * usuario (`<userId>/avatar.jpg`); el perfil solo guarda la URL pública.
 */

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB antes de reducir
export const AVATAR_SIZE_PX = 256;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function avatarObjectPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/** Valida el archivo elegido. Devuelve el mensaje de error o null si sirve. Función pura. */
export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "La foto debe ser una imagen JPG, PNG o WebP.";
  }
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > AVATAR_MAX_BYTES) return "La foto pesa más de 2 MB. Elige una más liviana.";
  return null;
}

/** Iniciales para el avatar sin foto: primera letra del primer y último nombre. Función pura. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

/**
 * Reduce la imagen a un cuadrado de máximo 256×256 y la devuelve como JPEG.
 * Así el bucket y el tráfico se mantienen pequeños aunque la foto original
 * sea enorme. Solo navegador (usa canvas).
 */
export async function downscaleAvatarImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const target = Math.min(AVATAR_SIZE_PX, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no-blob"))), "image/jpeg", 0.85),
    );
  } finally {
    bitmap.close();
  }
}
