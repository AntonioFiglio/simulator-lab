import "./globals.css";
import App from "@/components/App";
export const metadata = {
  title: "Simula — Consumer Simulation Lab",
  description:
    "Explore cenários financeiros e hipóteses de consumo com transparência.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <App />
        {children}
      </body>
    </html>
  );
}
