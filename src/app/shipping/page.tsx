import { StaticPage } from "@/components/Layout/StaticPage";

export default function ShippingPage() {
  return (
    <StaticPage title="Shipping Timelines">
      <p>Delivery across Saint Lucia typically takes 2–5 business days after payment verification. Remote districts may require an additional day.</p>
      <ul className="mt-4 space-y-2 list-disc list-inside text-brand-muted">
        <li>Castries & Gros Islet: 1–2 days</li>
        <li>Southern districts: 3–5 days</li>
        <li>All deliveries include SMS/WhatsApp updates</li>
      </ul>
    </StaticPage>
  );
}
