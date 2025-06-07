document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectWalletBtn');
    const addressSpan = document.getElementById('walletAddress');
  
    // Jeśli portfel był wcześniej połączony – przywróć adres z localStorage
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      addressSpan.textContent = shortenAddress(savedAddress);
      connectBtn.textContent = 'Disconnect';
    }
  
    connectBtn.addEventListener('click', async () => {
      if (connectBtn.textContent === 'Connect Wallet') {
        if (typeof window.ethereum !== 'undefined') {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            addressSpan.textContent = shortenAddress(account);
            localStorage.setItem('walletAddress', account);
            connectBtn.textContent = 'Disconnect';
          } catch (err) {
            alert('Nie udało się połączyć z portfelem.');
          }
        } else {
          alert('Zainstaluj MetaMask!');
        }
      } else {
        // Rozłączenie – usuń dane
        localStorage.removeItem('walletAddress');
        addressSpan.textContent = '';
        connectBtn.textContent = 'Connect Wallet';
      }
    });
  
    // Skracanie adresu: 0x1234...ABCD
    function shortenAddress(addr) {
      return addr.slice(0, 6) + '...' + addr.slice(-4);
    }
  });
    
    
    
    
    
  
  
  
  
  