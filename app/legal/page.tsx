"use client";

/**
 * VLYP Legal Page (Standalone Edition)
 * 外部依存をゼロにし、Next.js 16でのビルドエラーを強制回避します。
 */
export default function Legal() {
  const sections = [
    { h: "販売業者 / Operator", p: "VLYP 運営事務局 (VLYP Admin Office)" },
    { h: "代表者 / Representative", p: "請求があったら遅滞なく開示します / Provided upon request" },
    { h: "所在地 / Address", p: "請求があったら遅滞なく開示します / Provided upon request" },
    { h: "お問い合わせ先 / Contact", p: "vlypgameclip@gmail.com" },
    { h: "販売価格 / Price", p: "購入手続きの際に画面に表示される価格（税込） / As displayed at checkout" },
    { h: "代金の支払時期 / Payment", p: "チェックアウト時（即時） / Immediate at checkout" },
    { h: "商品の引渡時期 / Delivery", p: "決済完了後、即座に付与 / Immediate after payment" },
    { h: "返品・キャンセル / Refunds", p: "デジタルコンテンツのため返品不可 / Non-refundable" }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'black',
      color: 'white',
      padding: '40px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#22d3ee', marginBottom: '40px' }}>
          特定商取引法に基づく表記 / Legal Notice
        </h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sections.map((s, i) => (
            <div key={i} style={{ borderBottom: '1px solid #333', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>{s.h}</h2>
              <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{s.p}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '40px' }}>
          <a href="/" style={{ color: '#22d3ee', textDecoration: 'none', fontSize: '14px' }}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
