
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const STORAGE_KEY = "mira2040-state-v1";

  const factors = {
    car: 0.18,
    two: 0.045,
    bus: 0.035,
    train: 0.015,
    walk: 0
  };

  let mode = "car";

  let state;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
      { snapshot: null, missions: [] };
  } catch {
    state = { snapshot: null, missions: [] };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // PAGE NAVIGATION
  function navigate() {
    let page = location.hash.slice(1) || "home";

    const allowed = ["home", "footprint", "collective", "missions"];
    if (!allowed.includes(page)) page = "home";

    $$(".view").forEach(section => {
      section.classList.toggle(
        "active",
        section.dataset.view === page
      );
    });

    $$("nav a").forEach(link => {
      link.classList.toggle(
        "current",
        link.hash === "#" + page
      );
    });

    $("#mainNav").classList.remove("open");

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (page === "collective") renderCommunity();
    if (page === "missions") renderMissions();
    if (page === "footprint") calculate();
  }

  window.addEventListener("hashchange", navigate);

  $("#menuButton").onclick = () => {
    $("#mainNav").classList.toggle("open");
  };

  // CARBON CALCULATOR
  const electricity = $("#electricity");
  const distance = $("#distance");
  const waste = $("#waste");

  function calculate() {
    const e = Number(electricity.value);
    const d = Number(distance.value);
    const w = Number(waste.value);

    $("#electricityValue").textContent = e + " kWh";
    $("#distanceValue").textContent = d + " km";
    $("#wasteValue").textContent = w.toFixed(1) + " kg";

    const result = {
      electricity: +(e * 0.70).toFixed(1),
      transport: +(d * factors[mode]).toFixed(1),
      waste: +(w * 30 * 0.50).toFixed(1)
    };

    result.total = +(
      result.electricity +
      result.transport +
      result.waste
    ).toFixed(1);

    result.savedAt = new Date().toISOString();

    result.inputs = {
      electricity: e,
      distance: d,
      waste: w,
      mode: mode
    };

    $("#totalResult").textContent = result.total.toFixed(1);

    $("#electricityResult").textContent =
      result.electricity + " kg";

    $("#transportResult").textContent =
      result.transport + " kg";

    $("#wasteResult").textContent =
      result.waste + " kg";

    const max = Math.max(
      result.electricity,
      result.transport,
      result.waste,
      1
    );

    ["electricity", "transport", "waste"].forEach(key => {
      $("#" + key + "Bar").style.width =
        (result[key] / max * 100) + "%";
    });

    const biggest = Object.entries({
      Electricity: result.electricity,
      Transport: result.transport,
      Waste: result.waste
    }).sort((a, b) => b[1] - a[1])[0][0];

    $("#resultTip").textContent =
      biggest + " is your largest estimated category. " +
      "Try changing that habit first.";

    return result;
  }

  [electricity, distance, waste].forEach(input => {
    input.addEventListener("input", calculate);
  });

  $$(".mode").forEach(button => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode;

      $$(".mode").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      calculate();
    });
  });

  $("#carbonForm").addEventListener("submit", event => {
    event.preventDefault();

    state.snapshot = calculate();
    saveState();

    $("#saveStatus").textContent = "SNAPSHOT SAVED ✓";
  });

  // COLLECTIVE PAGE
  function renderCommunity() {
    const snapshot = state.snapshot;

    if (!snapshot) {
      $("#communityTotal").textContent = "No snapshot yet.";
      $("#communityDescription").textContent =
        "Complete the footprint meter and save your snapshot.";

      $("#savedDate").textContent = "—";

      $("#communityElectric").textContent = "—";
      $("#communityTransport").textContent = "—";
      $("#communityWaste").textContent = "—";

      return;
    }

    $("#communityTotal").textContent =
      snapshot.total.toFixed(1) + " kg CO₂e / month";

    $("#communityDescription").textContent =
      "Your latest saved personal estimate. " +
      "This information is stored locally on this device.";

    $("#savedDate").textContent =
      new Date(snapshot.savedAt).toLocaleString();

    $("#communityElectric").textContent =
      snapshot.electricity + " kg";

    $("#communityTransport").textContent =
      snapshot.transport + " kg";

    $("#communityWaste").textContent =
      snapshot.waste + " kg";
  }

  // WEEKLY MISSIONS
  const missionInputs = $$("[data-mission]");

  function renderMissions() {
    const completed = new Set(state.missions);

    missionInputs.forEach(input => {
      input.checked = completed.has(input.dataset.mission);

      input.closest(".mission").classList.toggle(
        "done",
        input.checked
      );
    });

    const count = completed.size;
    const percentage = Math.round(
      count / missionInputs.length * 100
    );

    $("#missionCount").textContent = count + " / 6";
    $("#progressPercent").textContent = percentage + "%";

    $("#progressRing").style.background =
      `conic-gradient(var(--acid) ${percentage * 3.6}deg, #435747 0deg)`;

    $("#missionMessage").textContent =
      count === 6
        ? "All six actions checked. Keep the habits going."
        : count === 0
          ? "A better city is built through repeatable habits."
          : count + " action(s) checked. Small steps are adding up.";
  }

  missionInputs.forEach(input => {
    input.addEventListener("change", () => {
      const completed = new Set(state.missions);

      if (input.checked) {
        completed.add(input.dataset.mission);
      } else {
        completed.delete(input.dataset.mission);
      }

      state.missions = [...completed];

      saveState();
      renderMissions();
    });
  });

  $("#resetMissions").addEventListener("click", () => {
    state.missions = [];
    saveState();
    renderMissions();
  });

  // 3D POINTER EFFECT
  const artwork = $(".hero-art");

  if (
    artwork &&
    matchMedia("(pointer:fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    artwork.addEventListener("pointermove", event => {
      const rect = artwork.getBoundingClientRect();

      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      const disc = $(".city-disc");

      disc.style.marginLeft = x * 12 + "px";
      disc.style.marginTop = y * 12 + "px";
    });

    artwork.addEventListener("pointerleave", () => {
      $(".city-disc").style.margin = "0";
    });
  }

  // INITIALISE THE WEBSITE
  calculate();
  renderCommunity();
  renderMissions();
  navigate();

})();
