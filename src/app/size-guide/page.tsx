import { StaticPage } from "@/components/Layout/StaticPage";

export default function SizeGuidePage() {
  return (
    <StaticPage title="Size Guide">
      <p>Our sizing follows international standards with a relaxed island fit. When in doubt, size up for comfort.</p>
      <table className="w-full mt-6 text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">Size</th>
            <th className="py-2 text-left">Bust (in)</th>
            <th className="py-2 text-left">Waist (in)</th>
            <th className="py-2 text-left">Hips (in)</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["S", "32-34", "24-26", "34-36"],
            ["M", "34-36", "26-28", "36-38"],
            ["L", "36-38", "28-30", "38-40"],
            ["XL", "38-40", "30-32", "40-42"],
          ].map(([size, bust, waist, hips]) => (
            <tr key={size} className="border-b border-white/20">
              <td className="py-2 font-semibold">{size}</td>
              <td className="py-2">{bust}</td>
              <td className="py-2">{waist}</td>
              <td className="py-2">{hips}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StaticPage>
  );
}
