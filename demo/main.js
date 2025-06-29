import "./netsi-address.bundle.js";

document.addEventListener("DOMContentLoaded", () => {
  const addressComponent = document.getElementById("address-component");
  const eventLog = document.getElementById("event-log");

  addressComponent.config = {
    useFuzzyFallback: true,
    per_side: 7,

    // Avanceret UI konfiguration med mapper
    ui: {
      // Bruger default selectors for de fleste felter, men overskriver og tilføjer
      "adgangsadresse.vejstykke.navn": "#vejnavn",
      "adgangsadresse.husnr": "#husnr",
      "adgangsadresse.kommune.navn": "#kommune",
      "adgangsadresse.postnummer.nr": "#zip",
      "adgangsadresse.postnummer.navn": "#city",

      // Avanceret mapping med en mapper funktion
      "historik.ændret": {
        selector: "#updated-date",
        mapper: (isoDateString) => {
          if (!isoDateString) return "Dato ukendt";
          // Formater ISO-datoen til et mere læseligt format
          const date = new Date(isoDateString);
          return date.toLocaleDateString("da-DK", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
    },
  };

  addressComponent.addEventListener("netsi-address:select", (e) => {
    logEvent("netsi-address:select", e.detail);
  });

  function logEvent(name, detail) {
    const content = detail ? JSON.stringify(detail, null, 2) : "";
    eventLog.textContent = `Event: ${name}\nPayload:\n${content}`;
  }
});
