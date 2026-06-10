import { uniqueUserKeyFields } from "../shared/merchants";
import { getUserKeys, setUserKey, getSettings, setSettings } from "../shared/storage";

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node;
}

function flashSaved(): void {
  const saved = el("saved");
  saved.textContent = "Saved.";
  window.setTimeout(() => (saved.textContent = ""), 1200);
}

async function render(): Promise<void> {
  const keys = await getUserKeys();
  const container = el("fields");
  container.textContent = "";

  for (const { field, label } of uniqueUserKeyFields()) {
    const wrap = document.createElement("div");
    wrap.className = "field";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.htmlFor = `field-${field}`;

    const input = document.createElement("input");
    input.type = "text";
    input.id = `field-${field}`;
    input.value = keys[field] ?? "";
    input.placeholder = "your affiliate id (e.g. yourtag-20)";
    input.addEventListener("change", async () => {
      await setUserKey(field, input.value.trim());
      flashSaved();
    });

    wrap.append(labelEl, input);
    container.append(wrap);
  }

  const ack = el("ack") as HTMLInputElement;
  ack.checked = (await getSettings()).acknowledgedDisclosure;
  ack.addEventListener("change", async () => {
    await setSettings({ acknowledgedDisclosure: ack.checked });
    flashSaved();
  });
}

void render();
