const marketList = document.getElementById('marketList');

    const dummyMarket = [
      { crop: 'Wheat', quantity: 100, price: 1500 },
      { crop: 'Corn', quantity: 80, price: 1200 },
      { crop: 'Rice', quantity: 200, price: 2000 },
    ];

    function showSection(id) {
      document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active-section'));
      document.getElementById(id).classList.add('active-section');
      document.getElementById('dashboardTitle').style.display = 'none';
    }

    function addItem() {
      const crop = document.getElementById('itemName').value;
      const qty = document.getElementById('itemQty').value;
      const price = document.getElementById('itemPrice').value;
      dummyMarket.push({ crop, quantity: qty, price });
      renderMarket();
    }

    function renderMarket() {
      marketList.innerHTML = '';
      dummyMarket.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h4>${item.crop}</h4><p>${item.quantity}kg @ ₹${item.price}</p>`;
        marketList.appendChild(card);
      });
    }

    function uploadProfilePic() {
      const file = document.getElementById('profilePicInput').files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('profilePic').src = e.target.result;
        document.getElementById('profilePic').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }

    function saveProfile() {
      const name = document.getElementById('userName').value;
      const email = document.getElementById('userEmail').value;
      const phone = document.getElementById('userPhone').value;
      document.getElementById('profileInfo').innerHTML = `<p><strong>Name:</strong> ${name}<br><strong>Email:</strong> ${email}<br><strong>Phone:</strong> ${phone}</p>`;
    }

    function acceptContract(btn) {
      btn.textContent = 'Accepted';
      btn.disabled = true;
    }

    function showPopup(text) {
      document.getElementById('popupContent').textContent = text;
      document.getElementById('popupOverlay').style.display = 'flex';
    }

    function closePopup() {
      document.getElementById('popupOverlay').style.display = 'none';
    }

    window.onload = () => {
      renderMarket();
    };