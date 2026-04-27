import { redirect } from "next/navigation";

/** Old URL: bookmarks and links still work. */
export default function RoomsPageRedirect() {
  redirect("/collaborate/aula-virtual");
}
