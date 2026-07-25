export const metadata = {
  title: "Orion",
  description: "Ton confident IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
