import logoImg from "figma:asset/da32ce1180d23d5a28e8ffcb227e16a2155b7d56.png";

export default function Logo() {
  return (
    <div className="flex items-center">
      <img 
        src={logoImg} 
        alt="RawStock Logo" 
        className="h-10 w-auto object-contain"
      />
    </div>
  );
}
