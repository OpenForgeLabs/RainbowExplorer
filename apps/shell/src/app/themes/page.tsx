import { redirect } from "next/navigation";

export default function LegacyThemesRoute() {
  redirect("/settings/themes");
}
