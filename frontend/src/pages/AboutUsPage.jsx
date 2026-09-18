import { Globe, Instagram, Youtube, Facebook, Github, ExternalLink, Apple, Smartphone, MessageCircle, Linkedin } from 'lucide-react';
import { C, FONT } from '../constants.js';

// RideMitr links surfaced on the About Us page. Each opens in a new tab.
const LINKS = [
  { label: 'Website',   sub: 'RideMitr.com',                url: 'https://www.ridemitr.com',                      Icon: Globe,     color: '#2563EB', img: '/ridemitr-logo.png' },
  { label: 'Instagram', sub: '@ridemitr_india',             url: 'https://www.instagram.com/ridemitr_india',      Icon: Instagram, color: '#E1306C' },
  { label: 'YouTube',   sub: '@ridemitr_ai',                url: 'https://www.youtube.com/@ridemitr_ai',          Icon: Youtube,   color: '#FF0000' },
  { label: 'Facebook',  sub: 'RideMitr',                    url: 'https://www.facebook.com/people/RideMitr/61570635166630/', Icon: Facebook,  color: '#1877F2' },
  { label: 'LinkedIn',  sub: 'RideMitr',                    url: 'https://www.linkedin.com/company/ridemitr/posts/?viewAsMember=true', Icon: Linkedin, color: '#0A66C2' },
  { label: 'GitHub',    sub: 'Nareshbhati2722',             url: 'https://github.com/Nareshbhati2722',            Icon: Github,    color: '#111111' },
  { label: 'iOS App',   sub: 'App Store',                   url: 'https://apps.apple.com/in/app/ridemitr/id6775524884', Icon: Apple, color: '#000000' },
  { label: 'Android App',sub: 'Google Play',                url: 'https://play.google.com/store/apps/details?id=com.md.ridemitr&pcampaignid=web_share', Icon: Smartphone, color: '#3DDC84' },
  { label: 'WhatsApp',  sub: 'Community',                   url: 'https://chat.whatsapp.com/Dz1MeOgstcBFcZ7kf7i47o', Icon: MessageCircle, color: '#25D366' },
];

export default function AboutUsPage() {
  return (
    <div style={{ padding: '40px 24px', fontFamily: FONT, color: C.text, maxWidth: 760, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img
          src="/ridemitr-logo.gif"
          alt="RideMitr"
          style={{ height: 64, width: 64, objectFit: 'contain', marginBottom: 14 }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>About RIDEMITR <span style={{ color: C.primary }}>AI</span></h1>
        <p style={{ fontSize: 14, color: C.textSecondary, margin: '10px auto 0', maxWidth: 540, lineHeight: 1.6 }}>
          RideMitr builds practical AI automation tools — including this WhatsApp CRM.
          Follow us and explore our work through the links below.
        </p>
      </div>

      {/* Link cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
      }}>
        {LINKS.map(({ label, sub, url, Icon, color, img }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px', borderRadius: 12,
              background: C.cardBg, border: `1px solid ${C.border}`,
              textDecoration: 'none', color: C.text,
              boxShadow: C.shadowSm, transition: 'transform .15s, box-shadow .15s, border-color .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = C.shadowMd;
              e.currentTarget.style.borderColor = color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = C.shadowSm;
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            <span style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: img ? '#fff' : `${color}18`,
              border: img ? `1px solid ${C.border}` : 'none',
              color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {img
                ? <img src={img} alt={label} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                : <Icon size={22} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{label}</span>
              <span style={{ display: 'block', fontSize: 12, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
            </span>
            <ExternalLink size={16} style={{ color: C.textMuted, flexShrink: 0 }} />
          </a>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 36, fontSize: 12, color: C.textMuted }}>
        © {new Date().getFullYear()} RideMitr · Powered by FMOS
      </div>
    </div>
  );
}
