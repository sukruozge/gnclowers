export interface Post {
  slug: string;
  date: string;
  title_tr: string;
  title_en: string;
  excerpt_tr: string;
  excerpt_en: string;
  bodyHtml_tr: string;
  bodyHtml_en: string;
}

const POSTS: Post[] = [
  {
    slug: 'kisiye-ozel-bebek-hediyesi',
    date: '2026-06-25',
    title_tr: 'Kişiye Özel Bebek Hediyesi Neden Bu Kadar Özel?',
    title_en: 'Why a Personalized Baby Gift Means So Much',
    excerpt_tr: 'İsmi işlenmiş, elde örülmüş bir hediye; bir bebeğe “sen bekleniyordun” demenin en sıcak yolu.',
    excerpt_en: 'A hand-crocheted gift with a name on it is the warmest way to say “you were waited for.”',
    bodyHtml_tr: `<p>Bir bebek için seçtiğiniz hediye, çoğu zaman ilk anılardan birinin parçası olur. Kişiye özel, elde örülmüş bir amigurumi ya da isimli bir parça; mağaza rafındaki sıradan bir üründen çok daha fazlasını anlatır — zaman, emek ve sevgi.</p><p>Aselovers’ta her parça siparişten sonra tek tek örülür. Bebeğin adını, sevdiğiniz rengi ve küçük detayları ekleyerek, yıllarca saklanacak bir hatıra yaratırız. Baby shower, doğum ya da “sadece sevdiğim için” anları için tam da bu yüzden tercih ediliyoruz.</p>`,
    bodyHtml_en: `<p>The gift you choose for a baby often becomes part of a first memory. A personalized, hand-crocheted amigurumi or a piece with a name on it says far more than something off a shelf — it says time, care, and love.</p><p>At Aselovers every piece is crocheted to order. We add the baby’s name, your favourite colours, and the little details that turn an object into a keepsake kept for years. That’s exactly why families choose us for baby showers, births, and “just because” moments.</p>`,
  },
  {
    slug: 'amigurumi-bakimi',
    date: '2026-06-15',
    title_tr: 'El Örgüsü Amigurumi Nasıl Temizlenir ve Saklanır?',
    title_en: 'How to Clean and Care for a Handmade Amigurumi',
    excerpt_tr: 'Doğru bakımla el örgüsü oyuncaklar yıllarca ilk günkü gibi kalır. İşte birkaç nazik ipucu.',
    excerpt_en: 'With gentle care, handmade toys stay lovely for years. A few simple tips.',
    bodyHtml_tr: `<p>El örgüsü amigurumiler dayanıklıdır ama sevgiyle yapıldıkları gibi sevgiyle de bakılmayı sever. Temizlik için ılık su ve az miktarda hassas deterjanla nazikçe elde yıkamanızı öneririz; ovalamak yerine sıkmadan bastırarak durulayın.</p><p>Kurutmak için düz bir havlunun üzerine yayıp gölgede bekletin — makine ve doğrudan güneş liflerin şeklini bozabilir. Uzun süre saklarken nemden uzak, hava alan bir yerde tutun. Bu küçük özen, oyuncağın yıllarca yumuşak ve canlı kalmasını sağlar.</p>`,
    bodyHtml_en: `<p>Handmade amigurumi are sturdy, but like anything made with love they prefer to be cared for gently. To clean, hand-wash in lukewarm water with a little mild detergent; press the water out rather than wringing or scrubbing.</p><p>Dry flat on a towel in the shade — machines and direct sun can distort the fibres. For long storage, keep them somewhere dry and airy. This small care keeps the toy soft and bright for years.</p>`,
  },
  {
    slug: 'bir-parcanin-hikayesi',
    date: '2026-06-05',
    title_tr: 'Bir Parçanın Hikâyesi: İlk İlmekten Kapıya',
    title_en: 'The Story of a Piece: From First Stitch to Your Door',
    excerpt_tr: 'Sipariş verdiğiniz an ile kapınızda bir kutu arasında; iplik, sabır ve minik detaylar var.',
    excerpt_en: 'Between your order and the box at your door: yarn, patience, and tiny details.',
    bodyHtml_tr: `<p>Her sipariş boş bir tezgâhta başlar. Önce iplik ve renkler seçilir; sonra saatler süren, ilmek ilmek sabırlı bir işçilik gelir. Gözler, minik aksesuarlar ve isim detayları en sona, en büyük özenle eklenir.</p><p>Bitince her parça tek tek kontrol edilir, şık şekilde paketlenir ve Türkiye ile ABD’ye yola çıkar. Kapınıza gelen kutunun içinde sadece bir oyuncak değil; sizin için ayrılmış bir zaman var.</p>`,
    bodyHtml_en: `<p>Every order begins at an empty table. First the yarn and colours are chosen; then come the hours of patient, stitch-by-stitch work. Eyes, tiny accessories, and name details are added last, with the greatest care.</p><p>When it’s done, each piece is checked one by one, packaged beautifully, and sent to Turkey and the US. Inside the box at your door is not just a toy — it’s time set aside just for you.</p>`,
  },
  {
    slug: 'yeni-dogana-hediye-rehberi',
    date: '2026-05-20',
    title_tr: 'Yeni Doğana Anlamlı Hediye Rehberi',
    title_en: 'A Guide to Meaningful Gifts for a Newborn',
    excerpt_tr: 'Baby shower ya da hoş geldin bebek: akılda kalan, kişisel ve güvenli hediyeler için fikirler.',
    excerpt_en: 'Baby shower or welcome-baby: ideas for memorable, personal, and safe gifts.',
    bodyHtml_tr: `<p>En sevilen hediyeler genellikle en kişisel olanlardır. İsimli bir amigurumi, odası için yumuşak bir dekor ya da minik bir aksesuar seti; hem şık görünür hem de yıllarca saklanır.</p><p>Seçim yaparken güvenli malzemeleri ve bebek dostu detayları önceliklendirin. Emin değilseniz WhatsApp’tan yazın — renk, isim ve tema için birlikte en anlamlı hediyeyi seçelim.</p>`,
    bodyHtml_en: `<p>The best-loved gifts are usually the most personal. A named amigurumi, a soft piece of décor for the nursery, or a little accessory set looks lovely and is kept for years.</p><p>When choosing, prioritise safe materials and baby-friendly details. Not sure? Message us on WhatsApp — we’ll pick the most meaningful gift together, from colour to name to theme.</p>`,
  },
];

export function loadPosts(): Post[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function postSlug(post: Post): string {
  return post.slug;
}
