export const authCopy = {
  es: {
    loginTitle: "Entrar",
    loginDescription: "Entra con Google o con tu correo y contraseña.",
    registerTitle: "Crear cuenta",
    registerDescription: "Regístrate con Google o con correo para sincronizar tu perfil en la nube.",
    continueWithGoogle: "Continuar con Google",
    orContinueWithEmail: "o con correo",
    email: "Correo",
    password: "Contraseña",
    submitLogin: "Entrar",
    submitRegister: "Registrarse",
    noAccount: "¿No tienes cuenta?",
    hasAccount: "¿Ya tienes cuenta?",
    registerLink: "Crear cuenta",
    loginLink: "Entrar",
    backHome: "Volver al inicio",
    supabaseMissing:
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local. Sin ellas el inicio de sesión no está disponible.",
    errorGeneric: "No pudimos completar la acción. Revisa correo y contraseña.",
    errorEmailNotConfirmed:
      "Tu correo aún no está confirmado. Revisa tu bandeja (spam/promociones) o usa «Reenviar correo de confirmación» en Crear cuenta. Para pruebas, puedes desactivar «Confirm email» en Supabase → Authentication → Providers → Email.",
    errorUserAlreadyRegistered:
      "Ese correo ya tiene una cuenta. Ve a «Entrar» (o usa «Olvidé mi contraseña» si la agregamos / si no recuerdas la clave).",
    errorInvalidLoginCredentials:
      "Correo o contraseña incorrectos. Si acabas de registrarte y no confirmaste el correo, desactiva «Confirm email» para pruebas o espera/reenviar la confirmación.",
    errorFailedToFetch:
      "No se pudo conectar con Supabase (red bloqueada o URL mal configurada). Prueba otra red o ventana de incógnito; desactiva VPN/antivirus que inspeccione HTTPS. En Vercel: revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Production y haz Redeploy. En Supabase: confirma que el proyecto no esté pausado.",
    errorOAuthProvider:
      "Inicio con Google no está disponible. Activa el proveedor Google en Supabase → Authentication → Providers y configura Client ID y Client Secret de Google Cloud.",
    checkEmail: "Si tu proyecto requiere confirmación, revisa tu correo para activar la cuenta.",
    registerSuccess: "Cuenta creada. Si pide confirmación por correo, ábrelo antes de entrar.",
    resendConfirmation: "Reenviar correo de confirmación",
    resendSent: "Hemos pedido otro correo. Espera unos minutos y revisa spam y «Promociones».",
    emailDeliveryHint:
      "Si no llega nada: los correos integrados de Supabase pueden tardar o ir a spam. En Supabase → Authentication → puedes configurar SMTP (Resend, SendGrid…). Para pruebas, en Providers → Email puedes desactivar «Confirm email» e iniciar sesión al instante.",
    loggedInHint: "Sesión iniciada. Tu perfil se sincroniza con Supabase cuando corresponde.",
    account: "Cuenta",
    sessionActive: "Sesión activa",
    notLoggedIn: "Sin sesión en la nube",
    notLoggedInHint: "Inicia sesión para guardar tu perfil en Supabase.",
    goLogin: "Ir a entrar",
    signOut: "Cerrar sesión",
    userId: "ID de usuario",
    authBypassBannerTitle: "Protección de rutas desactivada",
    authBypassBannerBody:
      "NEXT_PUBLIC_REQUIRE_AUTH está en false: la app es navegable sin iniciar sesión aunque Supabase esté configurado. No uses esto en producción con datos reales. En builds que no son desarrollo, el aviso solo aparece si defines NEXT_PUBLIC_SHOW_AUTH_BYPASS_WARNING=true.",
    authBypassBannerDismiss: "Entendido, ocultar",
    authBypassBannerShowAgain: "Volver a mostrar el aviso de seguridad",
    forgotPassword: "¿Olvidaste tu contraseña?",
    passwordHint: "Mínimo 6 caracteres.",
    recoverTitle: "Recuperar contraseña",
    recoverDescription:
      "Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva clave.",
    recoverSubmit: "Enviar enlace",
    recoverSent:
      "Si ese correo tiene una cuenta, recibirás el enlace en unos minutos. Revisa spam y «Promociones».",
    backToLogin: "Volver a entrar",
    newPasswordTitle: "Nueva contraseña",
    newPasswordDescription: "Elige una clave nueva para tu cuenta.",
    newPasswordSubmit: "Guardar contraseña",
    newPasswordSuccess: "Contraseña actualizada. Ya puedes entrar con tu nueva clave.",
    newPasswordInvalid:
      "Este enlace no es válido o ya caducó. Pide un enlace nuevo e inténtalo otra vez.",
    requestNewLink: "Pedir un enlace nuevo",
  },
} as const;
