// ================================================
// 직항 / 경유 선택
// ================================================
function toggleStopover(radio) {
    const stopoverBox = document.getElementById('stopover-box');
    const middleMap = document.querySelector('.middle_map');
    const middlePort = document.querySelector('.middle_port');
    const modal_middleTab = document.querySelector('#meteogram-modal .modal-tab:nth-child(2)');
    const modal_middleMap = document.querySelector('#meteogram-modal .tab-panel:nth-child(2)');
    const isStopover = radio.value === 'stopover';

    if (isStopover) {
        if (stopoverBox) stopoverBox.style.display = '';
        if (middleMap) middleMap.style.display = '';
        if (middlePort) middlePort.style.display = '';
        if (modal_middleTab) modal_middleTab.style.display = '';
        if (modal_middleMap) modal_middleMap.style.display = '';
    } else {
        if (stopoverBox) {
            stopoverBox.style.display = 'none';
            stopoverBox.querySelector('input').value = '';
        }
        if (middleMap) middleMap.style.display = 'none';
        if (middlePort) middlePort.style.display = 'none';
        if (modal_middleTab) modal_middleTab.style.display = 'none';
        if (modal_middleMap) modal_middleMap.style.display = 'none';
    }

    syncAirportWeatherStopover(isStopover);
    syncRouteViewState();
}

function setAirportWeatherPage(value) {
    document.querySelectorAll('.pdf-pages').forEach(function (page) {
        page.style.display = 'none';
    });

    const targetPage = document.getElementById(value + '-pages');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
}

function syncAirportWeatherStopover(isStopover) {
    const airportWeatherMiddlePort = document.querySelector('.Airport_Weather_content .middle-port');
    const middleFlightPortRadio = airportWeatherMiddlePort
        ? airportWeatherMiddlePort.querySelector('input[name="flightPort"]')
        : null;

    if (airportWeatherMiddlePort) {
        airportWeatherMiddlePort.style.display = isStopover ? '' : 'none';
    }

    if (!isStopover && middleFlightPortRadio && middleFlightPortRadio.checked) {
        const startFlightPortRadio = document.querySelector('.Airport_Weather_content input[name="flightPort"][value="start"]');
        if (startFlightPortRadio) {
            startFlightPortRadio.checked = true;
        }
        setAirportWeatherPage('start');
    }
}

function initFlightTypeOptionClicks() {
    document.querySelectorAll('#route-search-form .sub_radio').forEach(function (option) {
        const radio = option.querySelector('input[name="flightType"]');
        if (!radio) return;

        option.addEventListener('click', function () {
            selectFlightTypeOption(option);
        });
    });
}

function selectFlightTypeOption(option) {
    const radio = option ? option.querySelector('input[name="flightType"]') : null;
    if (!radio) return;

    if (!radio.checked) {
        radio.checked = true;
    }
    toggleStopover(radio);
}

window.toggleStopover = toggleStopover;
window.selectFlightTypeOption = selectFlightTypeOption;


// ================================================
// 지도 오픈
// ================================================
const mapOpenWrap = document.querySelector('.map-open-wrap');
const worldMapWrap = document.querySelector('.world_map_wrap');
const openTitle = document.getElementById('map_openTitle');
const mapOpenLabel = mapOpenWrap ? mapOpenWrap.querySelector('div:last-child') : null;
let routeSearchCommitted = false;
let lastFocusedRouteInput = null;

function refreshWorldMap() {
    setTimeout(() => {
        if (window.gisWeatherMap) {
            window.gisWeatherMap.updateSize();
        }
    }, 120);
}

function setWorldMapOpen(isOpen) {
    if (!worldMapWrap) return;

    if (isOpen) {
        requestAnimationFrame(() => {
            worldMapWrap.classList.add('is-open');
            refreshWorldMap();
        });
        if (openTitle) openTitle.textContent = '▲';
        if (mapOpenLabel) mapOpenLabel.textContent = '지도 닫기';
    } else {
        worldMapWrap.classList.remove('is-open');
        if (openTitle) openTitle.textContent = '▼';
        if (mapOpenLabel) mapOpenLabel.textContent = '지도 열기';
    }
}

function initMapOpenToggle() {
    if (mapOpenWrap && worldMapWrap) {
        mapOpenWrap.addEventListener('click', () => {
            setWorldMapOpen(!worldMapWrap.classList.contains('is-open'));
        });
    }
}


// ================================================
// 출발/경유/도착 공항 값 & 경로 상태
// ================================================
function getRouteInputs() {
    const routeForm = document.getElementById('route-search-form');
    if (!routeForm) return [];
    return Array.from(routeForm.querySelectorAll('input[name="icao"]'));
}

function getRouteValues() {
    const inputs = getRouteInputs();
    return {
        start: (inputs[0]?.value || '').trim().toUpperCase(),
        stopover: (inputs[1]?.value || '').trim().toUpperCase(),
        arrive: (inputs[2]?.value || '').trim().toUpperCase()
    };
}

function isStopoverRoute() {
    const routeForm = document.getElementById('route-search-form');
    const checkedFlightType = routeForm ? routeForm.querySelector('input[name="flightType"]:checked') : null;
    return checkedFlightType ? checkedFlightType.value === 'stopover' : false;
}

function hasRequiredRoute() {
    const route = getRouteValues();
    return route.start !== '' && route.arrive !== '' && (!isStopoverRoute() || route.stopover !== '');
}

function isDomesticAirport(icao) {
    return /^RK[A-Z0-9]{2}$/.test((icao || '').trim().toUpperCase());
}

function syncMetReport(port, icao) {
    const portInfo = port.querySelector('.port-info');
    if (!portInfo) return;

    const oldMetReport = portInfo.querySelector('.met-report');
    if (oldMetReport) {
        oldMetReport.remove();
    }

    if (!isDomesticAirport(icao)) return;

    const metReport = document.createElement('div');
    metReport.className = 'met-report';
    metReport.innerHTML = `
        <div class="met_report_title">MET REPORT</div>
        <div class="met_report_info">
            <p>MET REPORT ${icao} 210730Z WIND 22012KT VIS 10KM CLD CAVOK T 12 DP 07 QNH 1017HPA=</p>
        </div>
    `;

    const tafBlock = portInfo.querySelector('.taf');
    if (tafBlock) {
        portInfo.insertBefore(metReport, tafBlock);
    } else {
        portInfo.appendChild(metReport);
    }
}

function setRoutePortContent(selector, icao) {
    const port = document.querySelector(selector);
    if (!port || !icao) return;

    const portCode = port.querySelector('.port-name span:first-child');
    const portName = port.querySelector('.port-name span:nth-child(2)');
    const metarInfo = port.querySelector('.metar_info');
    const tafInfo = port.querySelector('.taf_info');

    if (portCode) portCode.textContent = icao;
    if (portName) portName.textContent = '';
    if (metarInfo) {
        metarInfo.innerHTML = `<p>METAR ${icao} 210730Z 22012KT 190V280 CAVOK 12/07 Q1017 NOSIG RMK ASIAN DUST(HWANGSA)=</p>`;
    }
    if (tafInfo) {
        tafInfo.innerHTML = `
            <p>TAF ${icao} 210500Z 2106/2212 21008KT 6000 NSC</p>
            <p>TN09/2121Z TX16/2205Z</p>
            <p>BECMG 2116/2118 18006KT 4000 BR</p>
            <p>BECMG 2119/2121 15006KT 6000 NSW</p>
            <p>BECMG 2201/2203 24010KT 9999 FEW030 BKN150</p>
            <p>BECMG 2210/2212 34007KT=</p>
        `;
    }

    syncMetReport(port, icao);
}

function syncRouteMetarTafContent() {
    const route = getRouteValues();
    setRoutePortContent('.start_port', route.start);
    setRoutePortContent('.middle_port', route.stopover);
    setRoutePortContent('.end_port', route.arrive);
}

function syncRouteViewState() {
    const showInfo = routeSearchCommitted && hasRequiredRoute();
    const mapInfoWrap = document.querySelector('.map_wrap');

    setWorldMapOpen(true);

    if (worldMapWrap) {
        worldMapWrap.classList.toggle('route-map-only', !showInfo);
        worldMapWrap.classList.toggle('route-has-info', showInfo);
    }

    if (mapInfoWrap) {
        mapInfoWrap.classList.toggle('route-info-hidden', !showInfo);
    }

    if (showInfo) {
        syncRouteMetarTafContent();
    }

    refreshWorldMap();
}

function syncRouteSearchSubmit(event) {
    if (event) event.preventDefault();

    getRouteInputs().forEach(input => {
        input.value = input.value.trim().toUpperCase();
    });

    if (!hasRequiredRoute()) {
        routeSearchCommitted = false;
        syncRouteViewState();
        return false;
    }

    routeSearchCommitted = true;
    syncRouteViewState();
    return false;
}

window.syncRouteSearchSubmit = syncRouteSearchSubmit;

function initRouteQueryValues() {
    const routeForm = document.getElementById('route-search-form');
    const inputs = getRouteInputs();
    if (!routeForm || inputs.length < 3) return;

    if (window.location.search) {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.hash);
    }

    routeForm.reset();
    const directRadio = routeForm.querySelector('input[name="flightType"][value="direct"]');
    if (directRadio) {
        directRadio.checked = true;
        toggleStopover(directRadio);
    }
    inputs.forEach(input => {
        input.value = '';
    });
    routeSearchCommitted = false;
}


// ================================================
// 공항 검색/선택 패널 (경로 입력용)
// ================================================
function initAirportListPanel() {
    const routeForm = document.getElementById('route-search-form');
    const panel = document.getElementById('route-airport-panel');
    const wrapper = panel ? panel.querySelector('.main_sls_form') : null;
    const openButton = document.querySelector('.route-airport-list-btn');
    const closeButton = wrapper ? wrapper.querySelector('.route-airport-close-btn') : null;
    const searchButton = wrapper ? wrapper.querySelector('button[name="search"]') : null;
    const keywordInput = wrapper ? wrapper.querySelector('input[name="q"]') : null;
    const keywordType = wrapper ? wrapper.querySelector('.chk_label[data-name="keyword-type"]') : null;
    const selectType = wrapper ? wrapper.querySelector('.chk_label[data-name="select-type"]') : null;
    const keywordBox = wrapper ? wrapper.querySelector('.airport-search-keyword') : null;
    const selectBox = wrapper ? wrapper.querySelector('.airport-search-select') : null;
    const resultBox = wrapper ? wrapper.querySelector('.airport-search-result') : null;
    const countrySelect = wrapper ? wrapper.querySelector('select[name="country"]') : null;
    const airportSelect = wrapper ? wrapper.querySelector('select[name="airport"]') : null;

    if (!panel || !wrapper || !openButton) return;

    const KEYWORD_TYPE = 'keyword-type';
    const SELECT_TYPE = 'select-type';
    const HISTORY_KEY = 'route-airport-search-history';
    const API_BASE = 'https://amo.kma.go.kr/';
    const FALLBACK_AIRPORTS = [
        { icao: 'RKSI', airportKor: '인천국제공항', airportEng: 'Incheon International Airport', cityKor: '인천', cityEng: 'Incheon', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'RKSS', airportKor: '김포국제공항', airportEng: 'Gimpo International Airport', cityKor: '서울', cityEng: 'Seoul', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'RKPC', airportKor: '제주국제공항', airportEng: 'Jeju International Airport', cityKor: '제주', cityEng: 'Jeju', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'RKPK', airportKor: '김해국제공항', airportEng: 'Gimhae International Airport', cityKor: '부산', cityEng: 'Busan', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'RKTN', airportKor: '대구국제공항', airportEng: 'Daegu International Airport', cityKor: '대구', cityEng: 'Daegu', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'RKTU', airportKor: '청주국제공항', airportEng: 'Cheongju International Airport', cityKor: '청주', cityEng: 'Cheongju', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'RKJJ', airportKor: '광주공항', airportEng: 'Gwangju Airport', cityKor: '광주', cityEng: 'Gwangju', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'RKTH', airportKor: '포항경주공항', airportEng: 'Pohang Gyeongju Airport', cityKor: '포항', cityEng: 'Pohang', countryKor: '대한민국', countryEng: 'Republic of Korea' },
        { icao: 'KJFK', airportKor: '뉴욕 존 F. 케네디', airportEng: 'John F. Kennedy International Airport', cityKor: '뉴욕', cityEng: 'New York', countryKor: '미국', countryEng: 'United States' },
        { icao: 'KLAX', airportKor: '로스앤젤레스', airportEng: 'Los Angeles International Airport', cityKor: '로스앤젤레스', cityEng: 'Los Angeles', countryKor: '미국', countryEng: 'United States' },
        { icao: 'KORD', airportKor: '시카고 오헤어', airportEng: "Chicago O'Hare International Airport", cityKor: '시카고', cityEng: 'Chicago', countryKor: '미국', countryEng: 'United States' },
        { icao: 'RJTT', airportKor: '도쿄 하네다', airportEng: 'Tokyo Haneda Airport', cityKor: '도쿄', cityEng: 'Tokyo', countryKor: '일본', countryEng: 'Japan' },
        { icao: 'RJAA', airportKor: '도쿄 나리타', airportEng: 'Narita International Airport', cityKor: '도쿄', cityEng: 'Tokyo', countryKor: '일본', countryEng: 'Japan' },
        { icao: 'ZBAA', airportKor: '베이징 수도', airportEng: 'Beijing Capital International Airport', cityKor: '베이징', cityEng: 'Beijing', countryKor: '중국', countryEng: 'China' },
        { icao: 'ZSPD', airportKor: '상하이 푸동', airportEng: 'Shanghai Pudong International Airport', cityKor: '상하이', cityEng: 'Shanghai', countryKor: '중국', countryEng: 'China' },
        { icao: 'UUEE', airportKor: '모스크바 셰레메티예보', airportEng: 'Sheremetyevo International Airport', cityKor: '모스크바', cityEng: 'Moscow', countryKor: '러시아', countryEng: 'Russia' }
    ];

    let currentType = KEYWORD_TYPE;
    let selectedAirport = null;
    let searchTimer = null;
    let lastQuery = '';
    let currentPage = 1;

    function openPanel() {
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        setType(KEYWORD_TYPE);
    }

    function closePanel() {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        if (resultBox) resultBox.style.display = 'none';
    }

    function isVisibleRouteInput(input) {
        if (!input) return false;
        const rect = input.getBoundingClientRect();
        const style = window.getComputedStyle(input);
        return rect.width > 0
            && rect.height > 0
            && style.display !== 'none'
            && style.visibility !== 'hidden';
    }

    function focusWithoutScroll(element) {
        if (!element) return;
        try {
            element.focus({ preventScroll: true });
        } catch (error) {
            element.focus();
        }
    }

    function getVisibleRouteInputs() {
        return getRouteInputs().filter(isVisibleRouteInput);
    }

    function getTargetRouteInput() {
        const inputs = getRouteInputs();
        const activeInput = document.activeElement && document.activeElement.matches('#route-search-form input[name="icao"]')
            ? document.activeElement
            : null;

        if (activeInput) return activeInput;
        if (inputs.includes(lastFocusedRouteInput) && isVisibleRouteInput(lastFocusedRouteInput)) {
            return lastFocusedRouteInput;
        }

        return inputs.find(input => isVisibleRouteInput(input) && !input.value.trim())
            || inputs.find(isVisibleRouteInput)
            || inputs[0];
    }

    function getNextRouteInput(currentInput) {
        const inputs = getVisibleRouteInputs();
        const currentIndex = inputs.indexOf(currentInput);

        if (currentIndex === -1) return inputs.find(input => !input.value.trim()) || null;

        return inputs.slice(currentIndex + 1).find(input => !input.value.trim())
            || inputs[currentIndex + 1]
            || null;
    }

    function fillFocusedOrFirstInput(icao) {
        const targetInput = getTargetRouteInput();

        if (targetInput && icao) {
            targetInput.value = icao.toUpperCase();
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            focusWithoutScroll(targetInput);
            lastFocusedRouteInput = targetInput;
        }

        return targetInput;
    }

    function resetKeywordSearch() {
        if (keywordInput) keywordInput.value = '';
        if (resultBox) {
            resultBox.innerHTML = '';
            resultBox.style.display = 'none';
        }
        selectedAirport = null;
        lastQuery = '';
    }

    function prepareNextAirportInput(nextInput) {
        if (!nextInput) {
            closePanel();
            return;
        }

        lastFocusedRouteInput = nextInput;
        focusWithoutScroll(nextInput);

        if (currentType === KEYWORD_TYPE) {
            resetKeywordSearch();
            window.setTimeout(() => {
                if (panel.classList.contains('is-open') && keywordInput) {
                    focusWithoutScroll(keywordInput);
                }
            }, 0);
        } else if (airportSelect) {
            airportSelect.value = '';
        }
    }

    function commitAirportSelection(airport) {
        const normalizedAirport = normalizeAirport(airport || selectedAirport || {});
        if (!normalizedAirport.icao) return false;

        selectedAirport = normalizedAirport;
        saveHistory(normalizedAirport);

        const filledInput = fillFocusedOrFirstInput(normalizedAirport.icao);
        const nextInput = getNextRouteInput(filledInput);
        prepareNextAirportInput(nextInput);

        return true;
    }

    function normalizeAirport(item) {
        return {
            icao: item.icao,
            name: item.airportKor || item.name || item.icao,
            nameEng: item.airportEng || item.nameEng || item.icao,
            cityKor: item.cityKor || '',
            cityEng: item.cityEng || '',
            countryKor: item.countryKor || item.country || '',
            countryEng: item.countryEng || ''
        };
    }

    function readHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function saveHistory(airport) {
        if (!airport || !airport.icao) return;
        const history = readHistory().filter(item => item.icao !== airport.icao);
        history.unshift(airport);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 3)));
        renderAirportHistory();
    }

    function renderAirportHistory() {
        const history = readHistory();
        wrapper.querySelectorAll('.airport-query-history').forEach(historyBox => {
            historyBox.innerHTML = '';

            if (history.length === 0) {
                const fallback = normalizeAirport(FALLBACK_AIRPORTS[0]);
                historyBox.appendChild(createHistoryLink(fallback));
                return;
            }

            history.forEach((item, index) => {
                historyBox.appendChild(createHistoryLink(item));
                if (index < history.length - 1) historyBox.append(', ');
            });
        });
    }

    function createHistoryLink(airport) {
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.icao = airport.icao;
        link.dataset.name = airport.name || airport.icao;
        link.dataset.nameEng = airport.nameEng || airport.icao;
        link.textContent = `${airport.name || airport.icao}(${airport.icao})`;
        return link;
    }

    function setType(type) {
        currentType = type;
        const isKeyword = type === KEYWORD_TYPE;

        if (keywordType) {
            keywordType.classList.toggle('active', isKeyword);
            keywordType.dataset.checked = String(isKeyword);
            keywordType.title = isKeyword ? '선택됨' : '';
        }
        if (selectType) {
            selectType.classList.toggle('active', !isKeyword);
            selectType.dataset.checked = String(!isKeyword);
            selectType.title = !isKeyword ? '선택됨' : '';
        }
        if (keywordBox) keywordBox.style.display = isKeyword ? '' : 'none';
        if (selectBox) selectBox.style.display = isKeyword ? 'none' : '';
        if (resultBox) resultBox.style.display = 'none';
        if (!isKeyword) initSelectUI();
    }

    function handleTypeClick(event) {
        const typeButton = event.currentTarget && event.currentTarget.matches('.chk_label[data-name]')
            ? event.currentTarget
            : event.target.closest('.chk_label[data-name]');

        if (!typeButton || !wrapper.contains(typeButton)) return;

        event.preventDefault();
        event.stopPropagation();
        setType(typeButton.dataset.name);
    }

    async function fetchAirportSearch(query, page) {
        const url = `${API_BASE}rest/world-airport/search.do?q=${encodeURIComponent(query)}&page=${page}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('airport search failed');
        return response.json();
    }

    function localAirportSearch(query) {
        const q = query.trim().toUpperCase();
        return FALLBACK_AIRPORTS.filter(item => {
            return item.icao.includes(q)
                || item.airportKor.includes(query)
                || item.airportEng.toUpperCase().includes(q)
                || item.cityKor.includes(query)
                || item.countryKor.includes(query)
                || item.countryEng.toUpperCase().includes(q);
        });
    }

    async function searchAirport(query, page = 1) {
        if (!query || !resultBox) return [];
        lastQuery = query;
        currentPage = page;

        let result = [];
        try {
            result = await fetchAirportSearch(query, page);
        } catch (error) {
            result = localAirportSearch(query);
        }
        return renderAirportResult(result);
    }

    function renderAirportResult(result) {
        if (!resultBox) return [];

        resultBox.innerHTML = '';
        const airports = result.map(normalizeAirport).filter(item => item.icao);

        airports.slice(0, 20).forEach(airport => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'airport-item';
            link.title = '공항선택';
            link.dataset.icao = airport.icao;
            link.dataset.name = airport.name;
            link.dataset.nameEng = airport.nameEng;
            link.textContent = `${airport.name}(${airport.icao}) - ${airport.cityKor},${airport.countryKor}`;
            item.appendChild(link);
            resultBox.appendChild(item);
        });

        if (airports.length === 0) {
            const item = document.createElement('li');
            const empty = document.createElement('span');
            empty.className = 'no-airports';
            empty.textContent = '해당하는 공항을 찾을 수 없습니다.';
            item.appendChild(empty);
            resultBox.appendChild(item);
            selectedAirport = null;
        } else if (airports.length === 1) {
            selectedAirport = airports[0];
        } else {
            selectedAirport = null;
        }

        resultBox.style.display = 'block';
        return airports;
    }

    function startQueryDelayed(delay) {
        if (searchTimer) window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => {
            const query = keywordInput ? keywordInput.value.trim() : '';
            searchAirport(query, 1);
            searchTimer = null;
        }, delay);
    }

    function readSelectedAirport() {
        if (currentType === SELECT_TYPE && airportSelect) {
            const selectedOption = airportSelect.options[airportSelect.selectedIndex];
            selectedAirport = selectedOption && selectedOption.value
                ? {
                    icao: selectedOption.value,
                    name: selectedOption.dataset.name || selectedOption.textContent,
                    nameEng: selectedOption.dataset.nameEng || selectedOption.textContent
                }
                : null;
        } else if (!selectedAirport && keywordInput) {
            const query = keywordInput.value.trim().toUpperCase();
            const exactMatch = localAirportSearch(query).find(item => item.icao === query);
            if (exactMatch) selectedAirport = normalizeAirport(exactMatch);
        }
    }

    function renderSelectOptions(airports) {
        if (!countrySelect || !airportSelect) return;

        const countries = Array.from(new Set(airports.map(item => item.countryKor).filter(Boolean))).sort();
        countrySelect.innerHTML = countries.map(country => `<option value="${country}">${country}</option>`).join('');
        if (countries.includes('대한민국')) countrySelect.value = '대한민국';

        renderAirportOptions(airports);
    }

    function renderAirportOptions(airports) {
        if (!countrySelect || !airportSelect) return;
        const country = countrySelect.value;
        const filtered = airports.filter(item => item.countryKor === country);

        airportSelect.innerHTML = '<option value="">선택</option>' + filtered.map(item => {
            return `<option value="${item.icao}" data-name="${item.airportKor}" data-name-eng="${item.airportEng}">${item.airportKor}</option>`;
        }).join('');
    }

    async function initSelectUI() {
        renderSelectOptions(FALLBACK_AIRPORTS);
        try {
            const response = await fetch(`${API_BASE}rest/world-airport/selects.do?country=${encodeURIComponent('대한민국')}`);
            if (!response.ok) return;
            const data = await response.json();
            if (!Array.isArray(data) || !Array.isArray(data[0])) return;

            if (countrySelect) {
                countrySelect.innerHTML = data[0].map(option => {
                    return `<option value="${option[1]}" data-name="${option[0]}" data-name-eng="${option[2]}">${option[0]}</option>`;
                }).join('');
                countrySelect.value = '대한민국';
            }
            if (airportSelect && Array.isArray(data[1])) {
                airportSelect.innerHTML = '<option value="">선택</option>' + data[1].filter(option => option[1] !== 'RKJK').map(option => {
                    return `<option value="${option[1]}" data-name="${option[0]}" data-name-eng="${option[2]}">${option[0]}</option>`;
                }).join('');
            }
        } catch (error) {
            renderSelectOptions(FALLBACK_AIRPORTS);
        }
    }

    openButton.addEventListener('click', event => {
        event.preventDefault();
        if (panel.classList.contains('is-open')) {
            closePanel();
        } else {
            openPanel();
        }
    });

    if (closeButton) {
        closeButton.addEventListener('click', event => {
            event.preventDefault();
            closePanel();
            openButton.focus();
        });
    }

    if (keywordType) keywordType.addEventListener('click', handleTypeClick);
    if (selectType) selectType.addEventListener('click', handleTypeClick);

    wrapper.addEventListener('click', event => {
        const typeButton = event.target.closest('.chk_label[data-name]');
        if (typeButton && wrapper.contains(typeButton)) {
            handleTypeClick(event);
            return;
        }

        const resultItem = event.target.closest('.airport-search-result a.airport-item');
        if (resultItem && wrapper.contains(resultItem)) {
            event.preventDefault();
            selectedAirport = {
                icao: resultItem.dataset.icao,
                name: resultItem.dataset.name,
                nameEng: resultItem.dataset.nameEng
            };
            commitAirportSelection(selectedAirport);
            return;
        }

        const historyLink = event.target.closest('.airport-query-history a[data-icao]');
        if (historyLink && wrapper.contains(historyLink)) {
            event.preventDefault();
            selectedAirport = {
                icao: historyLink.dataset.icao,
                name: historyLink.dataset.name || historyLink.textContent.replace(/\([^)]+\)/, ''),
                nameEng: historyLink.dataset.nameEng || historyLink.textContent
            };
            commitAirportSelection(selectedAirport);
        }
    });

    if (keywordInput) {
        keywordInput.addEventListener('keyup', async event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const airports = await searchAirport(keywordInput.value.trim(), 1);
                if (airports.length === 1) {
                    commitAirportSelection(airports[0]);
                }
            } else {
                selectedAirport = null;
                startQueryDelayed(500);
            }
        });

        keywordInput.addEventListener('focus', () => {
            if (keywordInput.value.trim() && resultBox && resultBox.children.length > 0) {
                resultBox.style.display = 'block';
            }
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', event => {
            event.preventDefault();
            readSelectedAirport();
            if (!commitAirportSelection(selectedAirport)) {
                alert('조회하실 공항을 선택하세요.');
                if (keywordInput && currentType === KEYWORD_TYPE) keywordInput.focus();
            }
        });
    }

    if (countrySelect) {
        countrySelect.addEventListener('change', () => {
            renderAirportOptions(FALLBACK_AIRPORTS);
        });
    }

    if (airportSelect) {
        airportSelect.addEventListener('change', () => {
            readSelectedAirport();
            commitAirportSelection(selectedAirport);
        });
    }

    document.addEventListener('click', event => {
        if (resultBox && !wrapper.contains(event.target)) {
            resultBox.style.display = 'none';
        }
    });

    if (routeForm) {
        routeForm.addEventListener('focusin', event => {
            if (event.target.matches('input[name="icao"]')) {
                lastFocusedRouteInput = event.target;
            }
        });

        routeForm.addEventListener('click', event => {
            if (event.target.matches('input[name="icao"]')) {
                lastFocusedRouteInput = event.target;
            }
        });

        routeForm.addEventListener('input', event => {
            if (event.target.matches('input[name="icao"]')) {
                lastFocusedRouteInput = event.target;
                event.target.value = event.target.value.toUpperCase();
                routeSearchCommitted = false;
                syncRouteViewState();
            }
        });
    }

    setType(KEYWORD_TYPE);
    renderAirportHistory();
}


// ================================================
// 탭 버튼 전환 (연직시계열 / SIGMET·AIRMET 등)
// ================================================
function initMapTabButtons() {
    document.querySelectorAll('.map_button_wrap button').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.map_button_wrap button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const tab = this.dataset.tab;
            const targetContent = document.querySelector('.' + tab + '_content');

            document.querySelectorAll('.map_content').forEach(content => content.classList.remove('active'));
            if (targetContent) targetContent.classList.add('active');
        });
    });
}


// ================================================
// 모달창 (메테오그램 / SIGMET·AIRMET)
// ================================================
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

// 오버레이 클릭 시 닫기
function initModalOverlayClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) closeModal(this.id);
        });
    });
}


// ================================================
// 공항기상정보 라디오 - 출발/경유/도착 페이지 전환
// ================================================
function initAirportWeatherPortRadios() {
    document.querySelectorAll('input[name="flightPort"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            setAirportWeatherPage(this.value);
        });
    });
}


// ================================================
// 초기화
// ================================================
initRouteQueryValues();
initFlightTypeOptionClicks();
initAirportListPanel();
initMapOpenToggle();
initMapTabButtons();
initModalOverlayClose();
initAirportWeatherPortRadios();

syncAirportWeatherStopover(isStopoverRoute());
syncRouteViewState();