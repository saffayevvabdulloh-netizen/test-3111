import { Button } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { useTitle } from "../../hooks/useApi";

export default function NotFound() {
  useTitle("Sahifa topilmadi");
  return (
    <div className="full-center">
      <Mascot mood="think" size={130} />
      <h1>404</h1>
      <p className="muted">Bunday sahifa yo'q. Manzilni tekshirib ko'ring.</p>
      <Button to="/" variant="primary">Bosh sahifaga qaytish</Button>
    </div>
  );
}
