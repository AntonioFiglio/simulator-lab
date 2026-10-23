import "./globals.css";
export const metadata = {
  title: "Simula — Consumer Simulation Lab",
  description:
    "Explore cenários financeiros e hipóteses de consumo com transparência.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
