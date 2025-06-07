document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('staking-form');
    const statusDiv = document.getElementById('status');
    const withdrawBtn = document.getElementById('withdraw-btn');
  
    form.addEventListener('submit', e => {
      e.preventDefault();
  
      const amount = parseFloat(document.getElementById('amount').value);
      const locktime = parseInt(document.getElementById('locktime').value);
  
      if (isNaN(amount) || amount < 0.01) {
        statusDiv.textContent = 'Podaj poprawną ilość ETH (min 0.01)';
        return;
      }
  
      // Tutaj dodaj wywołanie do smart kontraktu (później)
      statusDiv.textContent = `Zablokowano ${amount} ETH na ${locktime} dni. (Symulacja)`;
  
      // Aktywujemy przycisk Withdraw (symulacja)
      withdrawBtn.disabled = false;
    });
  
    withdrawBtn.addEventListener('click', () => {
      // Tu będzie logika wypłaty (później)
      statusDiv.textContent = 'Wypłata (symulacja) wykonana.';
      withdrawBtn.disabled = true;
    });
  });
  