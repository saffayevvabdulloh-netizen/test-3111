import { useRouteError } from "react-router-dom";
import Mascot from "./ui/Mascot";
import { Button } from "./ui/kit";

// A crashed page shows this inside the shell; the rest of the app keeps working.
export default function RouteError() {
  const err = useRouteError();
  const notFound = err?.status === 404;
  if (import.meta.env.DEV && !notFound) console.error(err);
  return (
    <div className="state" role="alert">
      <Mascot mood="think" size={110} />
      <h2>{notFound ? "Sahifa topilmadi" : "Bu sahifada xatolik yuz berdi"}</h2>
      <p>{notFound ? "Manzil noto'g'ri yoki sahifa o'chirilgan." : "Boshqa bo'limlar ishlashda davom etadi. Sahifani yangilab ko'ring."}</p>
      <div className="row">
        <Button onClick={() => window.location.reload()} icon="refresh">Yangilash</Button>
        <Button to="/" variant="primary">Bosh sahifa</Button>
      </div>
    </div>
  );
}
