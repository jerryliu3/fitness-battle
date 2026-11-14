import { VitalsLabCanvasScene } from "@fitness-battle/pursuit/vitals-lab";
import { createRoot } from "react-dom/client";

const mount = document.getElementById("root");
if (mount) {
  createRoot(mount).render(<VitalsLabCanvasScene />);
}
