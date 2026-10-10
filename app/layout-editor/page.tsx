import { notFound } from "next/navigation";
import LayoutEditor from "./Editor";

export default function LayoutEditorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LayoutEditor />;
}
