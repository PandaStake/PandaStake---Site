// js/app.js
console.log("app.js loaded");

function showToast(message, duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;        // jeśli nie ma kontenera, nic nie rób
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  // force recalc dla animacji
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
}

window.addEventListener("load", async () => {
  // 0) Check MetaMask availability and connect
  if (!window.ethereum) {
    document.getElementById("metamask-warning").style.display = "block";
    return;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  } catch (e) {
    console.warn("User rejected connection to MetaMask", e);
    return;
  }

  // 1) Contract address and ABI
  const contractAddress = "0x07Bd5A1A5AB8F754B4aB3c938affc1DC7fcbB671";
  const stakingAbi = [
    {
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "balances",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [],
      name: "stake",
      outputs: [],
      stateMutability: "payable",
      type: "function"
    },
    {
      inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
      name: "withdraw",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  // 2) DOM elements
  const stakeBtn    = document.getElementById("stakeEthBtn");
  const withdrawBtn = document.getElementById("withdrawBtn");
  const walletEl    = document.getElementById("walletBalance");
  const stakedEl    = document.getElementById("staked-amount");
  const statusEl    = document.querySelector(".status");

  // po linii, w której pobierasz DOM elements:
  const maxBtn = document.getElementById("maxBtn");

  // obsługa “Max”
  maxBtn.addEventListener("click", async () => {
    try {
      // pobierz adres i saldo
      const address = await signer.getAddress();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei));
      // ustaw w polu, z ograniczeniem do 4 miejsc po przecinku
      document.getElementById("stakeAmount").value = balanceEth.toFixed(4);
    } catch (err) {
      console.error("❌ Max button error:", err);
      showStatus("Error fetching balance", true);
    }
  });

  // store last success message so we can restore it after errors clear
  let lastSuccessMessage = "";

  /**
   * Show a status message. Errors (autoClear=true) clear after 7s,
   * then we restore the last success message. Successes (autoClear=false)
   * set lastSuccessMessage.
   * @param {string} msg
   * @param {boolean} [autoClear=true]
   */
  function showStatus(msg, autoClear = true) {
    statusEl.textContent = msg;
    clearTimeout(statusEl._timer);

    if (autoClear) {
      statusEl._timer = setTimeout(() => {
        statusEl.textContent = lastSuccessMessage;
      }, 7000);
    } else {
      lastSuccessMessage = msg;
    }
  }

  // 3) Provider, signer, contract instance
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer   = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, stakingAbi, signer);

  // 4) Update wallet balance display
  async function updateWalletBalance() {
    try {
      const address    = await signer.getAddress();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);
      if (walletEl) walletEl.textContent = `${balanceEth} ETH`;
    } catch (err) {
      console.error("❌ updateWalletBalance error:", err);
    }
  }

  // 5) Update staked balance display
  async function refreshStaked() {
    try {
      const address = await signer.getAddress();
      const balBig  = await contract.balances(address);
      const balEth  = parseFloat(ethers.formatEther(balBig)).toFixed(4);
      if (stakedEl) stakedEl.textContent = balEth;
    } catch (err) {
      console.error("❌ refreshStaked error:", err);
    }
  }

  // 6) Stake handler
  stakeBtn.addEventListener("click", async () => {
    if (!window.ethereum) return showStatus("Please install MetaMask!");

    const inputEl    = document.getElementById("stakeAmount");
    const amountStr  = inputEl.value.trim();
    const amountNum  = parseFloat(amountStr);
    const address    = await signer.getAddress();
    const balanceWei = await provider.getBalance(address);
    const balanceEth = parseFloat(ethers.formatEther(balanceWei));

    // Pre-validation
    if (!amountStr || isNaN(amountNum) || amountNum <= 0) {
      inputEl.classList.add("error");
      return showStatus("Enter a valid amount to stake");
    }
    inputEl.classList.remove("error");
    if (amountNum > balanceEth) {
      return showStatus(`Insufficient: you have ${balanceEth.toFixed(4)} ETH`);
    }

    try {
      stakeBtn.classList.add("pending");
      withdrawBtn.classList.add("pending");

      // pokaż pending aż do potwierdzenia
      showStatus("Stake pending…", false);

      const amountWei = ethers.parseEther(amountStr);
      const tx        = await contract.stake({ value: amountWei });
      await tx.wait();  // czekamy na potwierdzenie

      await updateWalletBalance();
      await refreshStaked();

      document.getElementById("stakeAmount").value = '';

      // po potwierdzeniu: komunikat i wyczyść po 7 sekundach
      statusEl.textContent = "Transaction confirmed";
      setTimeout(() => {
        statusEl.textContent = "";
      }, 7000);

    } catch (err) {
      console.error("❌ Stake error:", err);
      if (err.code === 4001) {
        return showStatus("Transaction cancelled");
      }
      if (/insufficient funds/i.test(err.message)) {
        return showStatus(`Insufficient: you have ${balanceEth.toFixed(4)} ETH`);
      }
      if (err.code === -32603) {
        return showStatus("Transaction failed on chain. Please try again or contact support.");
      }
      showStatus("Network timeout, please check your connection and try again.");
    } finally {
      stakeBtn.classList.remove("pending");
      withdrawBtn.classList.remove("pending");
    }
  });

  // 7) Withdraw handler
  withdrawBtn.addEventListener("click", async () => {
    if (!window.ethereum) return showStatus("Please install MetaMask!");

    const inputEl    = document.getElementById("stakeAmount");
    const amountStr  = inputEl.value.trim();
    const amountNum  = parseFloat(amountStr);
    const address    = await signer.getAddress();
    const balBig     = await contract.balances(address);
    const stakedEth  = parseFloat(ethers.formatEther(balBig));

    // Pre-validation
    if (!amountStr || isNaN(amountNum) || amountNum <= 0) {
      inputEl.classList.add("error");
      return showStatus("Enter a valid amount to withdraw");
    }
    inputEl.classList.remove("error");
    if (amountNum > stakedEth) {
      return showStatus(`Insufficient: you have ${stakedEth.toFixed(4)} ETH`);
    }

    try {
      stakeBtn.classList.add("pending");
      withdrawBtn.classList.add("pending");

      // pokaż pending aż do potwierdzenia
      showStatus("Withdraw pending…", false);

      const amountWei = ethers.parseEther(amountStr);
      const tx        = await contract.withdraw(amountWei);
      await tx.wait();  // czekamy na potwierdzenie

      await updateWalletBalance();
      await refreshStaked();

      document.getElementById("stakeAmount").value = '';

      // po potwierdzeniu: komunikat i wyczyść po 7 sekundach
      statusEl.textContent = "Transaction confirmed";
      setTimeout(() => {
        statusEl.textContent = "";
      }, 7000);

    } catch (err) {
      console.error("❌ Withdraw error:", err);
      if (err.code === 4001) {
        return showStatus("Transaction cancelled");
      }
      if (/insufficient funds/i.test(err.message)) {
        return showStatus(`Insufficient: you have ${stakedEth.toFixed(4)} ETH`);
      }
      if (err.code === -32603) {
        return showStatus("Transaction failed on chain. Please try again or contact support.");
      }
      showStatus("Network timeout, please check your connection and try again.");
    } finally {
      stakeBtn.classList.remove("pending");
      withdrawBtn.classList.remove("pending");
    }
  });

  // 8) Handle account changes
  window.ethereum.on("accountsChanged", async () => {
    await updateWalletBalance();
    await refreshStaked();
  });

  // 9) Initial data load
  await updateWalletBalance();
  await refreshStaked();
  setInterval(refreshStaked, 10_000);
});

// ===== NETWORK STATS (outside load) =====
async function refreshNetworkStats() {
  try {
    const res = await fetch("/stats.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { ethCount, userCount } = await res.json();
    document.getElementById("eth-count").textContent  = ethCount.toFixed(3);
    document.getElementById("user-count").textContent = userCount;
    document.getElementById("network-stats-card").classList.remove("loading");
  } catch (err) {
    console.error("Failed to fetch network-stats:", err);
  }
}

refreshNetworkStats();
setInterval(refreshNetworkStats, 15000);


// Po załadowaniu strony, interceptujemy wszystkie linki w sidebarze
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.sidebar .menu a.coming-soon').forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();                       // blokujemy domyślną nawigację
      showToast("Page under construction", 2000);
    });
  });
});

// Presale Sidebar – obsługa formularza
// ===============================

// Poczekaj, aż cały DOM się załaduje
window.addEventListener("DOMContentLoaded", () => {
  // Selektory
  const presaleFormSidebar = document.getElementById("presaleFormSidebar");
  const presaleEmailSidebar = document.getElementById("presaleEmailSidebar");
  const presaleStatusSidebar = document.getElementById("presaleStatusSidebar");

  // Prosta walidacja e-maila (ten sam regex co w głównym kodzie)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Funkcja do wyświetlania statusu (sukces/błąd)
  function showPresaleStatusSidebar(message, isError = false) {
    presaleStatusSidebar.textContent = message;
    presaleStatusSidebar.style.color = isError ? "#e74c3c" : "#2ecc71";
    // Po 7 sekundach wyczyść komunikat
    setTimeout(() => {
      presaleStatusSidebar.textContent = "";
    }, 7000);
  }

  presaleFormSidebar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = presaleEmailSidebar.value.trim().toLowerCase();
    if (!emailRegex.test(email)) {
      return showPresaleStatusSidebar("Please enter a valid email address", true);
    }

    // Zablokuj przycisk, żeby nie klikać wielokrotnie
    const submitBtn = presaleFormSidebar.querySelector("button");
    submitBtn.disabled = true;

    try {
      const response = await fetch("http://localhost:3000/presale-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        showPresaleStatusSidebar("Thank you! We'll notify you soon", false);
        presaleEmailSidebar.value = "";
      } else {
        // Jeśli server zwrócił błąd (np. 400 albo 409)
        const errorData = await response.json();
        showPresaleStatusSidebar(
          errorData.error || "Network error. Please try again later",
          true
        );
      }
    } catch (err) {
      console.error("Błąd sieci:", err);
      showPresaleStatusSidebar("Network error. Please try again later", true);
    } finally {
      submitBtn.disabled = false;
    }
  });
});



document.addEventListener("DOMContentLoaded", () => {
  // 1) Pobierz referencję do pola e-mail:
  const presaleEmailSidebar = document.getElementById("presaleEmailSidebar");

  // 2) Gdy użytkownik próbuje wysłać formularz z niepoprawnym e-mailem,
  //    wyświetl polską aplikację w języku angielskim.
  presaleEmailSidebar.addEventListener("invalid", (e) => {
    // Upewnij się, że to błąd "valueMissing" (puste) lub "typeMismatch" (nie zawiera '@')
    if (presaleEmailSidebar.validity.valueMissing) {
      presaleEmailSidebar.setCustomValidity("Please fill out this field");
    } else if (presaleEmailSidebar.validity.typeMismatch) {
      presaleEmailSidebar.setCustomValidity("Please include an '@' in the email address.");
    } else {
      // W pozostałych przypadkach nie nadpisuj (choć zwykle wystarczy powyżej)
      presaleEmailSidebar.setCustomValidity("");
    }
  });

  // 3) Na każde wprowadzanie treści wyczyść niestandardowy komunikat,
  //    aby przeglądarka mogła ponownie zadziałać z walidacją HTML5.
  presaleEmailSidebar.addEventListener("input", () => {
    presaleEmailSidebar.setCustomValidity("");
  });
});


document.addEventListener("DOMContentLoaded", () => {
  // Mapa: pozycja suwaka (1–9) → cena w USD
  const priceMapUSD = {
    1: 0.05,
    2: 0.10,
    3: 0.20,
    4: 0.40,
    5: 0.80,
    6: 1.60,
    7: 3.20,
    8: 6.40,
    9: 10.00
  };

  const CIRCULATING_SUPPLY = 2000000; // 2 000 000 PANDA w obiegu
  const slider = document.getElementById("priceSlider");
  const output = document.getElementById("sliderValue");

  function formatWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function updateValue() {
    const step = slider.value;               // 1–9
    const priceUSD = priceMapUSD[step];      // cena w USD
    const mcapUSD = priceUSD * CIRCULATING_SUPPLY;
    const mcapFormatted = formatWithCommas(mcapUSD.toFixed(0));

    output.textContent = `Price: $${priceUSD.toFixed(2)} → Market Cap: $${mcapFormatted}`;
  }

  // Ustaw wartość początkową
  updateValue();

  // Nasłuchuj zmiany suwaka
  slider.addEventListener("input", updateValue);
});
















