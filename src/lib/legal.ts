// Legal content for the storefront. Turkish is the primary (authoritative) market
// text; English is an adequate translation. Fields in [BRACKETS] are business
// registration details the owner must fill in before going live, then a lawyer
// should review the final text.

export const SELLER = {
  brand: 'Aselovers',
  legalName: '[İŞLETME / ŞİRKET UNVANI]',
  address: '[AÇIK ADRES]',
  taxOffice: '[VERGİ DAİRESİ]',
  taxNo: '[VERGİ / TC KİMLİK NO]',
  mersis: '[MERSİS NO]',
  email: 'info@aselovers.com',
  phone: '[TELEFON]',
  whatsapp: '+90 506 792 76 85',
  site: 'aseloves.com',
};

const UPDATED_TR = 'Temmuz 2026';
const UPDATED_EN = 'July 2026';

export interface LegalDoc { title: string; updated: string; html: string; }
export interface LegalEntry { key: string; tr: string; en: string; labelTr: string; labelEn: string; }

// Route slugs + footer labels for each legal page (order = footer order).
export const LEGAL_ROUTES: LegalEntry[] = [
  { key: 'privacy',  tr: 'gizlilik',            en: 'privacy',        labelTr: 'Gizlilik Politikası',        labelEn: 'Privacy Policy' },
  { key: 'terms',    tr: 'kullanim-kosullari',  en: 'terms',          labelTr: 'Kullanım Koşulları',          labelEn: 'Terms of Use' },
  { key: 'distance', tr: 'mesafeli-satis',      en: 'distance-sales', labelTr: 'Mesafeli Satış Sözleşmesi',   labelEn: 'Distance Sales Agreement' },
  { key: 'kvkk',     tr: 'kvkk',                en: 'data-protection', labelTr: 'KVKK Aydınlatma Metni',      labelEn: 'Data Protection Notice' },
  { key: 'returns',  tr: 'iade-iptal',          en: 'returns',        labelTr: 'İade ve İptal',               labelEn: 'Returns & Cancellations' },
  { key: 'shipping', tr: 'teslimat',            en: 'shipping',       labelTr: 'Teslimat ve Kargo',           labelEn: 'Shipping & Delivery' },
];

const sellerBlockTr = `
<p>
  <strong>Satıcı:</strong> ${SELLER.legalName} ("${SELLER.brand}")<br>
  <strong>Adres:</strong> ${SELLER.address}<br>
  <strong>Vergi Dairesi / No:</strong> ${SELLER.taxOffice} / ${SELLER.taxNo}<br>
  <strong>MERSİS:</strong> ${SELLER.mersis}<br>
  <strong>E-posta:</strong> <a href="mailto:${SELLER.email}">${SELLER.email}</a> &middot;
  <strong>Telefon:</strong> ${SELLER.phone} &middot; <strong>WhatsApp:</strong> ${SELLER.whatsapp}<br>
  <strong>Web:</strong> ${SELLER.site}
</p>`;

const sellerBlockEn = `
<p>
  <strong>Seller:</strong> ${SELLER.legalName} ("${SELLER.brand}")<br>
  <strong>Address:</strong> ${SELLER.address}<br>
  <strong>Tax office / no:</strong> ${SELLER.taxOffice} / ${SELLER.taxNo}<br>
  <strong>Email:</strong> <a href="mailto:${SELLER.email}">${SELLER.email}</a> &middot;
  <strong>Phone:</strong> ${SELLER.phone} &middot; <strong>WhatsApp:</strong> ${SELLER.whatsapp}<br>
  <strong>Web:</strong> ${SELLER.site}
</p>`;

export const LEGAL: Record<string, { tr: LegalDoc; en: LegalDoc }> = {
  // ── PRIVACY ─────────────────────────────────────────────
  privacy: {
    tr: { title: 'Gizlilik Politikası', updated: UPDATED_TR, html: `
<p>${SELLER.brand} olarak gizliliğinize önem veriyoruz. Bu politika, ${SELLER.site} sitesini kullandığınızda hangi verileri, neden ve nasıl işlediğimizi açıklar.</p>
<h2>1. Topladığımız veriler</h2>
<ul>
  <li><strong>Sipariş bilgileri:</strong> ad soyad, e-posta, telefon, teslimat/fatura adresi, sipariş içeriği.</li>
  <li><strong>İletişim bilgileri:</strong> canlı sohbet veya WhatsApp üzerinden bize ilettiğiniz mesaj ve iletişim bilgileri.</li>
  <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı/cihaz bilgisi ve site kullanım istatistikleri (ziyaret sayısı gibi).</li>
</ul>
<p>Ödeme kartı bilgileriniz <strong>bizim tarafımızdan görülmez ve saklanmaz</strong>; ödeme, lisanslı ödeme kuruluşu <strong>PayTR</strong> güvenli altyapısı üzerinden alınır.</p>
<h2>2. Verileri kullanma amaçlarımız</h2>
<ul>
  <li>Siparişinizi hazırlamak, göndermek ve size ulaşmak,</li>
  <li>Sorularınıza yanıt vermek ve destek sağlamak,</li>
  <li>Yasal yükümlülükleri (fatura, muhasebe vb.) yerine getirmek,</li>
  <li>Siteyi ve hizmet kalitesini geliştirmek.</li>
</ul>
<h2>3. Verilerin paylaşımı</h2>
<p>Verileriniz yalnızca hizmetin gerektirdiği ölçüde ve şu taraflarla paylaşılır: kargo firması (teslimat için), ödeme kuruluşu PayTR (ödeme için) ve yasal olarak yetkili kamu kurumları. Verileriniz pazarlama amacıyla üçüncü kişilere satılmaz.</p>
<h2>4. Çerezler</h2>
<p>Site, sepet ve dil tercihiniz gibi temel işlevler ile anonim ziyaret istatistikleri için tarayıcı depolama/çerez kullanır. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.</p>
<h2>5. Saklama süresi</h2>
<p>Verileriniz, ilgili mevzuatın (ör. ticari ve vergisel kayıtlar) öngördüğü süreler boyunca ve işleme amaçları devam ettiği sürece saklanır; süre sonunda silinir veya anonimleştirilir.</p>
<h2>6. Haklarınız</h2>
<p>KVKK kapsamındaki haklarınız için <a href="/tr/kvkk">KVKK Aydınlatma Metni</a>'ne bakabilir, taleplerinizi <a href="mailto:${SELLER.email}">${SELLER.email}</a> adresine iletebilirsiniz.</p>
${sellerBlockTr}` },
    en: { title: 'Privacy Policy', updated: UPDATED_EN, html: `
<p>At ${SELLER.brand} we care about your privacy. This policy explains what data we process when you use ${SELLER.site}, and why.</p>
<h2>1. Data we collect</h2>
<ul>
  <li><strong>Order data:</strong> name, email, phone, shipping/billing address, order contents.</li>
  <li><strong>Contact data:</strong> messages and contact details you send via live chat or WhatsApp.</li>
  <li><strong>Technical data:</strong> IP address, browser/device info and anonymous usage statistics.</li>
</ul>
<p>Your card details are <strong>never seen or stored by us</strong>; payments are processed through the licensed payment provider <strong>PayTR</strong>.</p>
<h2>2. How we use data</h2>
<ul>
  <li>To prepare, ship and follow up on your order,</li>
  <li>To answer your questions and provide support,</li>
  <li>To meet legal obligations (invoicing, accounting),</li>
  <li>To improve the site and our service.</li>
</ul>
<h2>3. Sharing</h2>
<p>Data is shared only as needed: the courier (for delivery), the payment provider PayTR (for payment) and legally authorised public authorities. We do not sell your data.</p>
<h2>4. Cookies</h2>
<p>The site uses browser storage/cookies for basic functions (cart, language) and anonymous analytics. You can manage cookies in your browser settings.</p>
<h2>5. Retention</h2>
<p>Data is kept for the periods required by applicable law and as long as the processing purpose continues, then deleted or anonymised.</p>
<h2>6. Your rights</h2>
<p>For your rights, see our <a href="/en/data-protection">Data Protection Notice</a> or contact <a href="mailto:${SELLER.email}">${SELLER.email}</a>.</p>
${sellerBlockEn}` },
  },

  // ── TERMS ───────────────────────────────────────────────
  terms: {
    tr: { title: 'Kullanım Koşulları', updated: UPDATED_TR, html: `
<p>${SELLER.site} sitesini kullanarak aşağıdaki koşulları kabul etmiş olursunuz. Lütfen dikkatle okuyun.</p>
<h2>1. Genel</h2>
<p>Bu site ${SELLER.brand} tarafından işletilmektedir. Sitedeki ürünler el yapımıdır; renk, boyut ve görünümde küçük farklılıklar el emeğinin doğasıdır ve kusur sayılmaz.</p>
<h2>2. Fikri mülkiyet</h2>
<p>Sitedeki tüm görsel, metin, logo ve tasarımlar ${SELLER.brand}'a aittir ve izinsiz kullanılamaz, kopyalanamaz.</p>
<h2>3. Sipariş ve fiyatlar</h2>
<p>Fiyatlar Türk Lirası (₺) cinsindendir ve KDV dahildir. Fiyat ve ürün bilgilerinde hata olması halinde ${SELLER.brand} siparişi iptal etme hakkını saklı tutar; bu durumda ödemeniz iade edilir.</p>
<h2>4. Sipariş süreci</h2>
<p>Ürünler siparişe özel elde örüldüğü için hazırlık süresi ürün açıklamasında belirtilir. Ödeme, güvenli PayTR altyapısı ile alınır.</p>
<h2>5. Sorumluluğun sınırı</h2>
<p>${SELLER.brand}, mücbir sebepler (doğal afet, kargo aksaklıkları vb.) kaynaklı gecikmelerden sorumlu tutulamaz. Ürünler oyuncak olarak tasarlanmıştır; küçük çocuklarda yetişkin gözetimi önerilir.</p>
<h2>6. Değişiklikler</h2>
<p>${SELLER.brand} bu koşulları güncelleyebilir. Güncel sürüm bu sayfada yayımlanır.</p>
<h2>7. Uygulanacak hukuk</h2>
<p>Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda [İL] mahkeme ve icra daireleri yetkilidir.</p>
${sellerBlockTr}` },
    en: { title: 'Terms of Use', updated: UPDATED_EN, html: `
<p>By using ${SELLER.site} you agree to the following terms.</p>
<h2>1. General</h2>
<p>This site is operated by ${SELLER.brand}. Products are handmade; small variations in colour, size and appearance are the nature of handcraft and are not defects.</p>
<h2>2. Intellectual property</h2>
<p>All images, text, logos and designs belong to ${SELLER.brand} and may not be used or copied without permission.</p>
<h2>3. Orders and prices</h2>
<p>Prices are shown in Turkish Lira (₺), VAT included. If a price or product error occurs, ${SELLER.brand} may cancel the order and refund you.</p>
<h2>4. Order process</h2>
<p>Items are crocheted to order; the preparation time is stated on the product page. Payments are taken via the secure PayTR infrastructure.</p>
<h2>5. Limitation of liability</h2>
<p>${SELLER.brand} is not liable for delays caused by force majeure (natural disasters, courier disruptions, etc.). Adult supervision is recommended for young children.</p>
<h2>6. Changes</h2>
<p>${SELLER.brand} may update these terms; the current version is published on this page.</p>
<h2>7. Governing law</h2>
<p>These terms are governed by the laws of the Republic of Türkiye.</p>
${sellerBlockEn}` },
  },

  // ── DISTANCE SALES ──────────────────────────────────────
  distance: {
    tr: { title: 'Mesafeli Satış Sözleşmesi', updated: UPDATED_TR, html: `
<p class="legal-note">Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, alıcı ile satıcı arasında elektronik ortamda kurulur. Sipariş onayı ile alıcı bu koşulları kabul etmiş sayılır.</p>
<h2>1. Taraflar</h2>
<h3>Satıcı</h3>
${sellerBlockTr}
<h3>Alıcı</h3>
<p>Sipariş sırasında bilgilerini giren müşteri ("Alıcı").</p>
<h2>2. Sözleşmenin konusu</h2>
<p>Alıcının, ${SELLER.site} üzerinden elektronik ortamda sipariş verdiği, nitelikleri ve satış fiyatı sitede belirtilen ürün/ürünlerin satışı ve teslimidir.</p>
<h2>3. Ürün ve ödeme</h2>
<p>Ürünlerin temel nitelikleri ve KDV dahil satış fiyatı ilgili ürün sayfasında ve sipariş özetinde yer alır. Ödeme, PayTR sanal POS altyapısı ile kredi/banka kartından tahsil edilir. Kargo ücreti (varsa) sipariş özetinde ayrıca gösterilir.</p>
<h2>4. Teslimat</h2>
<p>Ürün, siparişe özel hazırlandıktan sonra Alıcının bildirdiği adrese kargo ile teslim edilir. Hazırlık ve teslim süreleri <a href="/tr/teslimat">Teslimat ve Kargo</a> sayfasında açıklanmıştır. Yasal azami teslim süresi 30 gündür.</p>
<h2>5. Cayma hakkı</h2>
<p>Alıcı, teslim tarihinden itibaren <strong>14 gün</strong> içinde gerekçe göstermeden cayma hakkına sahiptir. Ancak <strong>Alıcının istekleri doğrultusunda kişiye özel hazırlanan</strong> (isim, özel renk/tasarım vb.) ürünlerde, Mesafeli Sözleşmeler Yönetmeliği md.15 gereği cayma hakkı kullanılamaz. Ayrıntı için <a href="/tr/iade-iptal">İade ve İptal</a> sayfasına bakınız.</p>
<h2>6. Cayma usulü ve iade</h2>
<p>Cayma hakkı geçerliyse Alıcı, <a href="mailto:${SELLER.email}">${SELLER.email}</a> üzerinden bildirim yapar; ürünü kullanılmamış ve tekrar satılabilir halde iade eder. Ödeme, iade onayından itibaren 14 gün içinde aynı yöntemle iade edilir.</p>
<h2>7. Uyuşmazlık</h2>
<p>Alıcı, şikayet ve itirazlarını Ticaret Bakanlığınca belirlenen parasal sınırlar çerçevesinde İl/İlçe Tüketici Hakem Heyetlerine veya Tüketici Mahkemelerine iletebilir.</p>` },
    en: { title: 'Distance Sales Agreement', updated: UPDATED_EN, html: `
<p class="legal-note">This agreement is concluded electronically between buyer and seller under Turkish Law No. 6502 on Consumer Protection and the Regulation on Distance Contracts. By confirming an order the buyer accepts these terms.</p>
<h2>1. Parties</h2>
<h3>Seller</h3>
${sellerBlockEn}
<h3>Buyer</h3>
<p>The customer who enters their details during checkout ("Buyer").</p>
<h2>2. Subject</h2>
<p>The sale and delivery of the product(s) ordered electronically via ${SELLER.site}, whose features and price are stated on the site.</p>
<h2>3. Product and payment</h2>
<p>Essential product features and the VAT-inclusive price are shown on the product page and order summary. Payment is collected from a credit/debit card via the PayTR virtual POS. Shipping fee (if any) is shown separately in the summary.</p>
<h2>4. Delivery</h2>
<p>After the made-to-order item is prepared, it is delivered by courier to the address provided. Preparation and delivery times are described on the <a href="/en/shipping">Shipping & Delivery</a> page. The legal maximum delivery period is 30 days.</p>
<h2>5. Right of withdrawal</h2>
<p>The Buyer may withdraw within <strong>14 days</strong> of delivery without cause. However, for <strong>personalised items made to the Buyer's specifications</strong> (name, custom colour/design), the right of withdrawal does not apply. See <a href="/en/returns">Returns & Cancellations</a>.</p>
<h2>6. Withdrawal and refund</h2>
<p>Where withdrawal applies, the Buyer notifies us at <a href="mailto:${SELLER.email}">${SELLER.email}</a> and returns the item unused and resellable. Refunds are made by the same method within 14 days of approval.</p>
<h2>7. Disputes</h2>
<p>Consumer disputes may be brought before the Turkish Consumer Arbitration Committees or Consumer Courts within the applicable monetary limits.</p>` },
  },

  // ── KVKK ────────────────────────────────────────────────
  kvkk: {
    tr: { title: 'KVKK Aydınlatma Metni', updated: UPDATED_TR, html: `
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla ${SELLER.legalName} ("${SELLER.brand}") tarafından kişisel verileriniz aşağıda açıklandığı şekilde işlenmektedir.</p>
<h2>1. İşlenen veriler ve amaç</h2>
<p>Kimlik, iletişim ve teslimat bilgileriniz; siparişin oluşturulması, teslimi, faturalandırma, müşteri desteği ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir.</p>
<h2>2. Hukuki sebep</h2>
<p>Veriler, sözleşmenin kurulması/ifası, hukuki yükümlülük ve meşru menfaat hukuki sebeplerine dayanılarak işlenir (KVKK md.5).</p>
<h2>3. Aktarım</h2>
<p>Veriler; kargo firması, ödeme kuruluşu (PayTR) ve yetkili kamu kurumlarıyla, yalnızca amaçla sınırlı olarak paylaşılabilir.</p>
<h2>4. Toplama yöntemi</h2>
<p>Veriler, site üzerindeki formlar, sipariş ve iletişim kanalları aracılığıyla elektronik ortamda toplanır.</p>
<h2>5. Haklarınız (md.11)</h2>
<ul>
  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
  <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
  <li>Amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
  <li>Eksik/yanlış işlenmişse düzeltilmesini isteme,</li>
  <li>Şartlar oluştuğunda silinmesini/yok edilmesini isteme,</li>
  <li>İşlemenin kanuna aykırılığı halinde zararın giderilmesini talep etme.</li>
</ul>
<p>Taleplerinizi <a href="mailto:${SELLER.email}">${SELLER.email}</a> adresine iletebilirsiniz.</p>
${sellerBlockTr}` },
    en: { title: 'Data Protection Notice', updated: UPDATED_EN, html: `
<p>Under Turkish Law No. 6698 on the Protection of Personal Data ("KVKK"), ${SELLER.legalName} ("${SELLER.brand}"), as data controller, processes your personal data as described below.</p>
<h2>1. Data and purpose</h2>
<p>Your identity, contact and delivery data are processed to create and deliver orders, invoice, provide support and meet legal obligations.</p>
<h2>2. Legal basis</h2>
<p>Data is processed based on performance of a contract, legal obligation and legitimate interest (KVKK art.5).</p>
<h2>3. Transfers</h2>
<p>Data may be shared, only as needed, with the courier, the payment provider (PayTR) and authorised public authorities.</p>
<h2>4. Collection</h2>
<p>Data is collected electronically via site forms, order and contact channels.</p>
<h2>5. Your rights (art.11)</h2>
<ul>
  <li>Learn whether your data is processed and request information,</li>
  <li>Request correction of incomplete/incorrect data,</li>
  <li>Request deletion where conditions are met,</li>
  <li>Object to processing and seek compensation for unlawful processing.</li>
</ul>
<p>Send requests to <a href="mailto:${SELLER.email}">${SELLER.email}</a>.</p>
${sellerBlockEn}` },
  },

  // ── RETURNS ─────────────────────────────────────────────
  returns: {
    tr: { title: 'İade ve İptal Koşulları', updated: UPDATED_TR, html: `
<h2>1. Cayma hakkı</h2>
<p>Teslimattan itibaren <strong>14 gün</strong> içinde, ürünü kullanılmamış ve tekrar satılabilir halde iade ederek cayma hakkınızı kullanabilirsiniz.</p>
<h2>2. Cayma hakkının istisnası</h2>
<p>Sizin talebiniz doğrultusunda <strong>kişiye özel hazırlanan</strong> ürünlerde (özel isim, kişiye özel renk/tasarım) mevzuat gereği cayma hakkı kullanılamaz. Ürün ayıplı ise bu istisna uygulanmaz.</p>
<h2>3. Sipariş iptali</h2>
<p>Siparişiniz henüz üretime alınmadıysa <a href="mailto:${SELLER.email}">${SELLER.email}</a> veya WhatsApp (${SELLER.whatsapp}) üzerinden ücretsiz iptal edebilirsiniz; ödemeniz iade edilir.</p>
<h2>4. Ayıplı/hasarlı ürün</h2>
<p>Ürün hatalı veya kargoda hasar görmüş ulaştıysa, teslimattan sonra en kısa sürede fotoğraflarla bize ulaşın; değişim veya tam iade sağlarız. Bu durumda kargo masrafı bize aittir.</p>
<h2>5. İade süreci</h2>
<ol>
  <li><a href="mailto:${SELLER.email}">${SELLER.email}</a> adresine sipariş numaranızla iade talebinizi iletin.</li>
  <li>Onay sonrası ürünü belirtilen adrese gönderin.</li>
  <li>Ürün tarafımıza ulaşıp kontrol edildikten sonra, <strong>14 gün</strong> içinde ödemeniz aynı yöntemle iade edilir.</li>
</ol>
<p>Cayma kaynaklı iadelerde kargo ücreti alıcıya aittir; ayıplı ürün iadelerinde satıcıya aittir.</p>` },
    en: { title: 'Returns & Cancellations', updated: UPDATED_EN, html: `
<h2>1. Right of withdrawal</h2>
<p>Within <strong>14 days</strong> of delivery you may withdraw by returning the item unused and resellable.</p>
<h2>2. Exception</h2>
<p>For <strong>personalised items</strong> made to your specification (custom name, colour/design), the right of withdrawal does not apply by law — unless the item is defective.</p>
<h2>3. Order cancellation</h2>
<p>If your order has not yet entered production, cancel it free of charge via <a href="mailto:${SELLER.email}">${SELLER.email}</a> or WhatsApp (${SELLER.whatsapp}); you will be refunded.</p>
<h2>4. Defective/damaged items</h2>
<p>If your item arrives faulty or damaged in transit, contact us with photos as soon as possible; we will replace it or refund you in full. We cover shipping in this case.</p>
<h2>5. Return process</h2>
<ol>
  <li>Email <a href="mailto:${SELLER.email}">${SELLER.email}</a> with your order number.</li>
  <li>After approval, ship the item to the given address.</li>
  <li>Once received and checked, you are refunded by the same method within <strong>14 days</strong>.</li>
</ol>
<p>For withdrawal returns the buyer covers shipping; for defective items the seller does.</p>` },
  },

  // ── SHIPPING ────────────────────────────────────────────
  shipping: {
    tr: { title: 'Teslimat ve Kargo', updated: UPDATED_TR, html: `
<h2>1. Hazırlık süresi</h2>
<p>Ürünlerimiz siparişe özel, tek tek elde örülür. Hazırlık süresi ürün ve yoğunluğa göre genellikle <strong>3–7 gün</strong>dür; hazır ürünler 1–3 iş günü içinde kargoya verilir. Özel siparişlerde net süre baştan bildirilir.</p>
<h2>2. Kargo bölgeleri ve ücret</h2>
<p>Türkiye ve yurt dışına gönderim yapıyoruz. Kargo ücreti (varsa) teslimat bölgesine göre <strong>sipariş özetinde</strong> ayrıca gösterilir ve ödeme öncesinde toplamda görünür.</p>
<table>
  <tr><th>Bölge</th><th>Yöntem</th><th>Tahmini süre</th></tr>
  <tr><td>Türkiye</td><td>Anlaşmalı kargo</td><td>1–3 iş günü (kargoya verildikten sonra)</td></tr>
  <tr><td>Yurt dışı</td><td>Uluslararası kargo / Etsy</td><td>7–21 iş günü</td></tr>
</table>
<h2>3. Takip</h2>
<p>Kargoya verildiğinde takip bilgisi e-posta veya WhatsApp ile paylaşılır.</p>
<h2>4. Teslim alamama</h2>
<p>Adres hatası veya teslim alınamama nedeniyle iade olan gönderilerde, yeniden gönderim kargo ücreti alıcıya ait olabilir.</p>
<h2>5. Gümrük</h2>
<p>Yurt dışı gönderimlerde oluşabilecek gümrük vergisi/harçları alıcının sorumluluğundadır.</p>` },
    en: { title: 'Shipping & Delivery', updated: UPDATED_EN, html: `
<h2>1. Preparation time</h2>
<p>Our items are crocheted to order, one at a time. Preparation is usually <strong>3–7 days</strong>; ready items ship within 1–3 business days. For custom orders the exact time is confirmed upfront.</p>
<h2>2. Regions and fees</h2>
<p>We ship to Türkiye and internationally. Shipping fee (if any) is shown separately in the <strong>order summary</strong> and included in the total before payment.</p>
<table>
  <tr><th>Region</th><th>Method</th><th>Estimated time</th></tr>
  <tr><td>Türkiye</td><td>Contracted courier</td><td>1–3 business days (after dispatch)</td></tr>
  <tr><td>International</td><td>International courier / Etsy</td><td>7–21 business days</td></tr>
</table>
<h2>3. Tracking</h2>
<p>Tracking info is shared by email or WhatsApp once dispatched.</p>
<h2>4. Failed delivery</h2>
<p>For parcels returned due to a wrong address or failure to collect, re-shipping fees may be charged to the buyer.</p>
<h2>5. Customs</h2>
<p>Any customs duties/taxes on international orders are the buyer's responsibility.</p>` },
  },
};
