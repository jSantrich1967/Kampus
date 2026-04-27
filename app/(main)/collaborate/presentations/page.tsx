import { redirect } from "next/navigation";

/** URL antigua: enlaces y calendario pueden seguir apuntando aquí. */
export default function PresentationsRedirectPage() {
  redirect("/collaborate/exposiciones");
}
