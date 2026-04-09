import { RAWSTOCK_LOGO_URL } from "./rawstockLogoUrl";

export default function Logo() {
  return (
    <div className="flex items-center">
      <img
        src={RAWSTOCK_LOGO_URL}
        alt="RawStock Logo"
        className="h-10 w-auto object-contain"
      />
    </div>
  );
}
