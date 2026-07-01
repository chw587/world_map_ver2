// 직항 / 경유 선택
function toggleStopover(radio) {
    const stopoverBox = document.getElementById('stopover-box');
    const middleMap = document.querySelector('.middle_map');
    const middlePort = document.querySelector('.middle_port');
    const modal_middleTab = document.querySelector('#meteogram-modal .modal-tab:nth-child(2)');
        const modal_middleMap = document.querySelector('#meteogram-modal .tab-panel:nth-child(2)');

    if (radio.value === 'stopover') {
        stopoverBox.style.display = '';
        middleMap.style.display = '';
        middlePort.style.display = '';
        modal_middleTab.style.display = '';
        modal_middleMap.style.display = '';
    } else {
        stopoverBox.style.display = 'none';
        middleMap.style.display = 'none';
        middlePort.style.display = 'none';
        modal_middleTab.style.display = 'none';
        modal_middleMap.style.display = 'none';
        stopoverBox.querySelector('input').value = '';
    }
}

// 지도 오픈
const mapOpenWrap = document.querySelector('.map-open-wrap');
const worldMapWrap = document.querySelector('.world_map_wrap');
const openTitle = document.getElementById('map_openTitle');

function refreshWorldMap() {
    setTimeout(() => {
        if (window.gisWeatherMap) {
            window.gisWeatherMap.updateSize();
        }
    }, 120);
}

mapOpenWrap.addEventListener('click', () => {
    const isOpen = worldMapWrap.classList.contains('is-open');

    if (isOpen) {
        worldMapWrap.classList.remove('is-open');
        openTitle.textContent = '▼';
    } else {
        requestAnimationFrame(() => {
            worldMapWrap.classList.add('is-open');
        });
        openTitle.textContent = '▲';
        refreshWorldMap();
    }
});



// 탭 버튼 전환
document.querySelectorAll('.map_button_wrap button').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.map_button_wrap button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        const tab = this.dataset.tab;

        document.querySelectorAll('.map_content').forEach(content => content.classList.remove('active'));
        document.querySelector('.' + tab + '_content').classList.add('active');
    });
});


//  모달창
function openModal(modalId, tabIndex) {
    document.getElementById(modalId).classList.add('open');
    switchModalTab(modalId, tabIndex);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
}

function switchModalTab(modalId, index) {
    const modal = document.getElementById(modalId);
    modal.querySelectorAll('.modal-tab').forEach((t, i) => t.classList.toggle('active', i === index));
    modal.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === index));
}

/* ── 오버레이 클릭 시 닫기 ── */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) closeModal(this.id);
    });
});


// 공항기상정보 라디오 페이지 전환
document.querySelectorAll('input[name="flightPort"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        // 모든 pdf-pages 숨기기
        document.querySelectorAll('.pdf-pages').forEach(function(page) {
            page.style.display = 'none';
        });

        // 선택된 값에 따라 해당 페이지 보이기
        const value = this.value;
        if (value === 'start') {
            document.getElementById('start-pages').style.display = 'block';
        } else if (value === 'middle') {
            document.getElementById('middle-pages').style.display = 'block';
        } else if (value === 'arrive') {
            document.getElementById('arrive-pages').style.display = 'block';
        }
    });
});
