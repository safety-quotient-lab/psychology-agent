function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(function(el) {
        el.classList.remove('active');
    });
    document.querySelectorAll('.nav-tabs .tab').forEach(function(el) {
        el.classList.remove('active');
    });
    var tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');
    var link = document.querySelector('.nav-tabs .tab[onclick*="' + tabName + '"]');
    if (link) link.classList.add('active');
    window.location.hash = tabName;
}

(function() {
    var hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById('tab-' + hash)) {
        switchTab(hash);
    }
})();

function toggleRow(id) {
    var row = document.getElementById(id);
    var header = row.previousElementSibling;
    var arrow = header.querySelector('td:first-child');
    if (row.style.display === 'none') {
        row.style.display = 'table-row';
        arrow.textContent = '\u25BE';
    } else {
        row.style.display = 'none';
        arrow.textContent = '\u25B8';
    }
}

function toggleSession(id) {
    var thread = document.getElementById(id);
    thread.style.display = thread.style.display === 'none' ? 'block' : 'none';
}
