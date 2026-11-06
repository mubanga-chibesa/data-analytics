import Image from "next/image";

// Official University of Zambia coat of arms (/public/unza-logo.jpg).
// The source asset has a white background; mounted on a small flat white
// tile (no ring, no shadow, no circle) so it reads as a flush brand mark
// rather than an "app icon" avatar.
export function Emblem({ size = 40 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden bg-white"
      style={{ width: size, height: size, borderRadius: size * 0.2 }}
    >
      <Image
        src="/unza-logo.jpg"
        alt="University of Zambia"
        width={size}
        height={size}
        className="h-[90%] w-[90%] object-contain"
        priority
      />
    </span>
  );
}
