// ---- Store config: edit these values, nothing else needs to change ----
const STORE = {
  // Leave price empty until you have a confirmed supplier cost, then add e.g. "€129".
  price: "",
  colors: [
    { name: "Black", shoe: "#1b1b1b", strap: "#1b1b1b", inner: "#e9a99c", buckle: "#c9a24a" },
    { name: "Ivory", shoe: "#efe8dc", strap: "#efe8dc", inner: "#e9a99c", buckle: "#c9a24a" },
    { name: "Gold",  shoe: "#d4b05a", strap: "#d4b05a", inner: "#e9a99c", buckle: "#8a6d1f" },
    { name: "Red",   shoe: "#d12f3b", strap: "#d12f3b", inner: "#e9a99c", buckle: "#c9a24a" }
  ],
  sizes: [36, 37, 38, 39, 40, 41, 42],
  // Optional: paste a form endpoint (Formspree, Make.com or Zapier webhook) to receive sign-ups.
  endpoint: ""
};

const $ = (s) => document.querySelector(s);
let color = STORE.colors[0], size = null;

function paint(c) {
  color = c;
  document.querySelectorAll(".shoe").forEach((el) => {
    el.style.setProperty("--shoe", c.shoe);
    el.style.setProperty("--strap", c.strap);
    el.style.setProperty("--inner", c.inner);
    el.style.setProperty("--buckle", c.buckle);
  });
  $("#colorName").textContent = c.name;
  document.querySelectorAll(".sw").forEach((b) => b.setAttribute("aria-checked", b.dataset.name === c.name));
  $("#styleField").value = `Strappy Sandal - ${c.name}${size ? " - EU " + size : ""}`;
}

STORE.colors.forEach((c) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "sw"; b.dataset.name = c.name;
  b.setAttribute("role", "radio"); b.setAttribute("aria-label", c.name); b.title = c.name;
  b.style.background = c.shoe;
  b.onclick = () => paint(c);
  $("#swatches").appendChild(b);
});

STORE.sizes.forEach((n) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "sz"; b.textContent = n;
  b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
  b.onclick = () => {
    size = n;
    document.querySelectorAll(".sz").forEach((x) => x.setAttribute("aria-checked", x === b));
    paint(color);
  };
  $("#sizes").appendChild(b);
});

$("#price").textContent = STORE.price || "Launch pricing shared with the waitlist first";
$("#yr").textContent = new Date().getFullYear();
paint(color);

function say(el, text, kind) { el.textContent = text; el.className = "fine " + (kind || ""); }

async function save(entry) {
  try {
    const list = JSON.parse(localStorage.getItem("eg_waitlist") || "[]");
    list.push(entry);
    localStorage.setItem("eg_waitlist", JSON.stringify(list));
  } catch (e) { /* storage may be blocked */ }
  if (STORE.endpoint) {
    const r = await fetch(STORE.endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(entry)
    });
    if (!r.ok) throw new Error("Could not send");
  }
}

$("#reserve").onclick = () => {
  if (!size) { say($("#reserveMsg"), "Pick your size first.", "err"); return; }
  say($("#reserveMsg"), "Great choice. Add your details below to join the waitlist.", "ok");
  paint(color);
  $("#waitlist").scrollIntoView({ behavior: "smooth" });
};

$("#waitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $("#formMsg");
  const email = f.email.value.trim();
  if (!f.name.value.trim()) return say(msg, "Please add your first name.", "err");
  if (!/^\S+@\S+\.\S+$/.test(email)) return say(msg, "Please enter a valid email address.", "err");
  if (!f.consent.checked) return say(msg, "Please tick the consent box.", "err");
  const entry = {
    name: f.name.value.trim(), email, phone: f.phone.value.trim(),
    country: f.country.value, style: f.style.value, consent: true, at: new Date().toISOString()
  };
  try {
    await save(entry);
    say(msg, "You are on the list. We will email you before launch.", "ok");
    f.reset(); paint(color);
  } catch (err) {
    say(msg, "Something went wrong. Please try again.", "err");
  }
});
