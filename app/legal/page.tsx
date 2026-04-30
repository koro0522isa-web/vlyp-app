"use client";

/**
 * VLYP Legal Page (Standalone Edition)
 * 外部依存をゼロにし、Next.js 16でのビルドエラーを強制回避します。
 */
export default function Legal() {
  const sections = [
    { h: "法人名または氏名", p: "VLYP 運営事務局 (村田 偉咲)" },
    { h: "代表者", p: "村田 偉咲" },
    { h: "所在地", p: "請求がありましたら、遅滞なく電磁的記録にて開示します。" },
    { h: "電話番号", p: "請求がありましたら、遅滞なく電磁的記録にて開示します。" },
    { h: "メールアドレス", p: "vlypgameclip@gmail.com" },
    { h: "販売価格", p: "VLYP Proプラン: 月額 $9.99" },
    { h: "追加手数料", p: "サービスを利用するためのインターネット通信料はお客様のご負担となります。" },
    { h: "受け付け可能な決済手段", p: "クレジットカード (Visa, MasterCard, American Express, JCB等)" },
    { h: "決済期間", p: "クレジットカード決済：ただちに処理されます。" },
    { h: "商品の引渡時期", p: "決済完了後、即座にPro機能（AI編集、制限解除）がアカウントに適用されます。" },
    { h: "交換および返品", p: "デジタルコンテンツという商品の性質上、決済完了後のキャンセル、返品、返金はお受けできません。" }
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

        <div style={{ marginTop: '24px', fontSize: '12px', color: '#999', lineHeight: '1.6' }}>
          ※当方は個人事業主であり、特定商取引法第11条ただし書の規定に基づき、住所および電話番号の表記を省略しております。ご請求をいただいた場合、遅滞なく開示いたします。
        </div>

        <div style={{ marginTop: '40px' }}>
          <a href="/" style={{ color: '#22d3ee', textDecoration: 'none', fontSize: '14px' }}>← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
