import Navbar from "@/components/Navbar";
import RootLayout from "./(root)/layout";
import Image from "next/image";

export default function Home() {
  return (
    <section>
      <RootLayout children={undefined} />
      <Navbar />
    </section>
  );
}
