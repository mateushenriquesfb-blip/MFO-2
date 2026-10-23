// Cria o link de pagamento da InfinitePay. Roda no servidor do Vercel (pasta api/).
// Os preços ficam AQUI, para o cliente não conseguir alterar o valor pelo navegador.
const HANDLE = "mateus-henri-"; // sua InfiniteTag, sem o $
const CATALOGO = [{"n": "Malbec Tradicional", "p": 155.0}, {"n": "Malbec Signature", "p": 220.0}, {"n": "Malbec Magnetic", "p": 185.0}, {"n": "Malbec Black", "p": 185.0}, {"n": "Ilia Jardim Secreto", "p": 100.0}, {"n": "Ilia Tradicional", "p": 100.0}, {"n": "Luna Tradicional", "p": 80.0}, {"n": "Liz D’Essence", "p": 120.0}, {"n": "Lily Tradicional Parfum", "p": 195.0}, {"n": "Floratta Gold", "p": 105.0}, {"n": "Body Splash Oud Bello", "p": 25.0}, {"n": "Body Splash Pokaloka", "p": 15.0}, {"n": "Body Splash Iluminador Luna Glow (Tradicional)", "p": 55.0}, {"n": "Body Splash Boa Noite Miniatura", "p": 28.0}, {"n": "Body Splash Morango e Leite", "p": 75.0}, {"n": "Body Splash Miss Care", "p": 30.0}, {"n": "Body Splash Yara Bello Charme", "p": 25.0}, {"n": "Kit Malbec Gold", "p": 210.0}, {"n": "Kit Floratta Gold", "p": 135.0}, {"n": "Kit Liz Tradicional", "p": 155.0}, {"n": "Kit Malbec X", "p": 195.0}, {"n": "Kit Malbec Icon", "p": 158.0}, {"n": "Kit Obsessão por Baunilha", "p": 55.0}, {"n": "Kit de Leite", "p": 68.0}, {"n": "Máscara Regeneração Pós Química", "p": 38.0}, {"n": "Máscara Hair Plastia", "p": 50.0}, {"n": "Máscara Resgate Imediato", "p": 50.0}, {"n": "Óleo Banana e Rícino Salon Line", "p": 16.0}, {"n": "Óleo Pink Fatal Salon Line", "p": 16.0}, {"n": "Sérum Volume Imediato", "p": 55.0}, {"n": "Combo Cica Therapy", "p": 90.0}, {"n": "Kit Lumina Hidratação e Proteção Antipoluição", "p": 68.0}, {"n": "Kit Rapunzel", "p": 75.0}, {"n": "Kit Tannic Acid Lola", "p": 65.0}, {"n": "Kit Reconstrói os Fios", "p": 145.0}, {"n": "Kit Nutri Diamond", "p": 200.0}, {"n": "Kit Natura Lumina Reconstrução", "p": 100.0}, {"n": "Máscara Desmaia Cabelo Forever Liss", "p": 38.0}, {"n": "Kit Liso Intenso", "p": 135.0}, {"n": "Sabonete Facial Clareador", "p": 38.0}, {"n": "Hidratante Show de Banho", "p": 38.0}, {"n": "Refil Hidratante Rosa e Algodão", "p": 40.0}, {"n": "Arnica em Gel Extra Forte", "p": 20.0}, {"n": "Desodorante Angelic Bello Charme", "p": 18.0}, {"n": "Desodorante em Creme Noz Pecã e Cacau", "p": 15.0}, {"n": "Creme Mãos e Pés", "p": 15.0}, {"n": "Aparador de Pelos Pure Confidence", "p": 185.0}];
const CUPONS = {
  BEMVINDO10: { t: "pct", v: 10, m: 0 }, CHEIROSA15: { t: "pct", v: 15, m: 100 },
  MFO20: { t: "fix", v: 20, m: 150 }, RELAMPAGO5: { t: "pct", v: 5, m: 0 }, PRESENTE30: { t: "fix", v: 30, m: 250 },
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método inválido" });
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { return res.status(400).json({ erro: "Pedido inválido" }); } }
  b = b || {};
  const itens = Array.isArray(b.itens) ? b.itens : [];
  if (!itens.length || itens.length > 40) return res.status(400).json({ erro: "Carrinho inválido" });
  let sub = 0; const items = [];
  for (const it of itens) {
    const p = CATALOGO[it.i], q = parseInt(it.q, 10);
    if (!p || !(q >= 1 && q <= 20)) return res.status(400).json({ erro: "Item inválido" });
    const cents = Math.round(p.p * 100); sub += cents * q;
    items.push({ quantity: q, price: cents, description: p.n.slice(0, 80) });
  }
  const pedido = String(b.pedido || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 40) || "MFO" + Date.now();
  const c = b.cupom ? CUPONS[String(b.cupom).toUpperCase()] : null;
  let linhas = items;
  if (c && sub >= c.m * 100) {
    let d = c.t === "pct" ? Math.round(sub * c.v / 100) : c.v * 100;
    d = Math.min(d, sub - 100);
    linhas = [{ quantity: 1, price: sub - d, description: ("Pedido " + pedido + " (cupom " + String(b.cupom).toUpperCase() + ")").slice(0, 80) }];
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const payload = { handle: HANDLE, order_nsu: pedido, redirect_url: "https://" + host + "/?pago=1", items: linhas };
  try {
    const r = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    const url = j.url || j.checkout_url;
    if (!r.ok || !url) return res.status(502).json({ erro: "A InfinitePay não devolveu o link", detalhe: j });
    return res.status(200).json({ url });
  } catch (e) { return res.status(502).json({ erro: "Falha ao falar com a InfinitePay" }); }
};
