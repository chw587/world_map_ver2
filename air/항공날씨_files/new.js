// ================================================
// 직항 / 경유 선택
// ================================================
function toggleStopover(radio) {
    const isStopover = radio.value === 'stopover';

    const stopoverBox = document.getElementById('stopover-box');
    const airportListStopoverBox = document.getElementById('airport-list-stopover-box');
    const toggleTargets = [
        stopoverBox,
        airportListStopoverBox,
        document.querySelector('.middle_map'),
        document.querySelector('.middle_port'),
        document.querySelector('#meteogram-modal .modal-tab:nth-child(2)'),
        document.querySelector('#meteogram-modal .tab-panel:nth-child(2)')
    ];

    toggleTargets.forEach(function (el) {
        if (!el) return;

        el.style.display = isStopover ? '' : 'none';

        // 직항 전환 시 경유 입력값 초기화 (stopoverBox / airportListStopoverBox만 해당)
        if (!isStopover && (el === stopoverBox || el === airportListStopoverBox)) {
            const stopoverInput = el.querySelector('input');
            if (stopoverInput) stopoverInput.value = '';
        }
    });

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
    return Array.from(routeForm.querySelectorAll('.sub-text-input input[name="icao"]'));
}

function getRouteValues() {
    const inputs = getRouteInputs();
    return {
        start: getAirportInputIcao(inputs[0]),
        stopover: getAirportInputIcao(inputs[1]),
        arrive: getAirportInputIcao(inputs[2])
    };
}

function getAirportFromInput(input) {
    const icao = getAirportInputIcao(input);
    if (!icao) return null;

    const displayValue = (input?.value || '').trim();
    const displayNameMatch = displayValue.match(/^(.+)\([A-Z0-9]{4}\)\s*$/i);
    const displayName = displayNameMatch ? displayNameMatch[1].trim() : '';
    const airport = findAirportByIcao(icao);

    return {
        icao,
        name: input?.dataset.airportName || displayName || airport?.name || airport?.nameEng || '',
        nameEng: input?.dataset.airportNameEng || airport?.nameEng || ''
    };
}

function getRouteAirports() {
    const inputs = getRouteInputs();
    return {
        start: getAirportFromInput(inputs[0]),
        stopover: getAirportFromInput(inputs[1]),
        arrive: getAirportFromInput(inputs[2])
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

// 260713: METAR 여러 줄(관측시각 다른 3개) + 비행조건(VFR 등) 데이터를 만들어주는 헬퍼
function buildMetarEntries(icao) {
    // 260713: 이미지 양식처럼 최근 관측 3건을 최신순으로 구성 (실제 데이터 연동 전까지의 표시용 샘플)
    return [
        { text: `METAR ${icao} 210730Z 22012KT 190V280 CAVOK 12/07 Q1017 NOSIG RMK ASIAN DUST(HWANGSA)=`, flight: 'VFR' },
        { text: `METAR ${icao} 210700Z 23012KT 190V280 CAVOK 12/07 Q1017 NOSIG=`, flight: 'VFR' },
        { text: `METAR ${icao} 210630Z 23011KT 180V250 CAVOK 11/07 Q1017 NOSIG=`, flight: 'VFR' }
    ];
}

// 260713: metar_info(ul) 안을 이미지 양식(줄마다 <li><p>본문</p><span class="metar_flag">비행조건</span></li>)대로 채움
function renderMetarInfo(metarInfo, icao) {
    if (!metarInfo) return;

    const entries = buildMetarEntries(icao);
    metarInfo.innerHTML = entries.map(function (entry) {
        return `<li><p>${entry.text}</p><span class="metar_flag">${entry.flight}</span></li>`;
    }).join('');
}

function setRoutePortContent(selector, airport) {
    const port = document.querySelector(selector);
    const icao = airport?.icao || '';
    if (!port || !icao) return;

    const portCode = port.querySelector('.port-name span:first-child');
    const portName = port.querySelector('.port-name span:nth-child(2)');
    const metarInfo = port.querySelector('.metar_info');
    const tafInfo = port.querySelector('.taf_info');

    if (portCode) portCode.textContent = icao;
    if (portName) {
        portName.textContent = airport.name || '';
        portName.title = airport.name || airport.nameEng || '';
    }
    // 260713: 단일 <p> 대신 이미지 양식(3줄 + VFR)으로 렌더링
    renderMetarInfo(metarInfo, icao);
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
    const route = getRouteAirports();
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
        normalizeAirportInputDisplay(input);
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
        clearAirportInputMeta(input);
    });
    routeSearchCommitted = false;
}


// ================================================
// 공항 목록 검색 (amo.kma.go.kr main_sls_form 방식)
// ================================================
let airportListRouteIndex = 0;

function getAirportData() {
    const data = window.WORLD_AIRPORT_DATA || {};
    return {
        countries: Array.isArray(data.countries) ? data.countries : [],
        airportsByCountry: data.airportsByCountry || {},
        airports: Array.isArray(data.airports) ? data.airports : []
    };
}

function normalizeAirportText(value) {
    return (value || '').toString().trim().toUpperCase();
}

function extractAirportIcao(value) {
    const normalized = normalizeAirportText(value);
    if (!normalized) return '';

    const parenMatch = normalized.match(/\(([A-Z0-9]{4})\)\s*$/);
    if (parenMatch) return parenMatch[1];

    if (/^[A-Z0-9]{4}$/.test(normalized)) return normalized;

    const codeMatch = normalized.match(/\b([A-Z][A-Z0-9]{3})\b/);
    return codeMatch ? codeMatch[1] : '';
}

function findAirportByIcao(icao) {
    const normalizedIcao = normalizeAirportText(icao);
    if (!normalizedIcao) return null;

    return getAirportData().airports.find(function (airport) {
        return normalizeAirportText(airport.icao) === normalizedIcao;
    }) || null;
}

function formatAirportDisplayText(airport) {
    if (!airport || !airport.icao) return '';

    const icao = normalizeAirportText(airport.icao);
    const name = (airport.name || airport.nameEng || '').toString().trim();
    return name ? `${name}(${icao})` : icao;
}

function setAirportInputValue(input, airport) {
    if (!input || !airport || !airport.icao) return;

    const displayText = formatAirportDisplayText(airport);
    input.value = displayText;
    input.title = displayText;
    input.dataset.icao = normalizeAirportText(airport.icao);
    input.dataset.airportName = airport.name || '';
    input.dataset.airportNameEng = airport.nameEng || '';
}

function clearAirportInputMeta(input) {
    if (!input) return;

    delete input.dataset.icao;
    delete input.dataset.airportName;
    delete input.dataset.airportNameEng;
    input.removeAttribute('title');
}

function getAirportInputIcao(input) {
    if (!input) return '';

    const datasetIcao = normalizeAirportText(input.dataset.icao);
    if (datasetIcao) return datasetIcao;

    return extractAirportIcao(input.value);
}

function normalizeAirportInputDisplay(input) {
    if (!input) return;

    const icao = getAirportInputIcao(input);
    if (!icao) {
        input.value = input.value.trim();
        clearAirportInputMeta(input);
        return;
    }

    const airport = findAirportByIcao(icao);
    if (airport) {
        setAirportInputValue(input, airport);
        return;
    }

    input.value = icao;
    input.dataset.icao = icao;
}

function copyAirportInputValue(source, target) {
    if (!source || !target) return;

    target.value = source.value || '';
    if (source.title) target.title = source.title;
    else target.removeAttribute('title');

    if (source.dataset.icao) target.dataset.icao = source.dataset.icao;
    else delete target.dataset.icao;

    if (source.dataset.airportName) target.dataset.airportName = source.dataset.airportName;
    else delete target.dataset.airportName;

    if (source.dataset.airportNameEng) target.dataset.airportNameEng = source.dataset.airportNameEng;
    else delete target.dataset.airportNameEng;
}

function getAirportListModalInputs() {
    const modal = document.getElementById('airport-list-modal');
    return modal ? Array.from(modal.querySelectorAll('.modal-tabs input[name="icao"]')) : [];
}

function setAirportListRouteIndex(index) {
    const routeInputs = getRouteInputs();
    const maxIndex = routeInputs.length - 1;
    airportListRouteIndex = Math.max(0, Math.min(Number(index) || 0, maxIndex));

    const modal = document.getElementById('airport-list-modal');
    if (!modal) return;

    syncAirportListModalInputs();
}

function getNextAirportListRouteIndex(index) {
    const routeOrder = isStopoverRoute() ? [0, 1, 2] : [0, 2];
    const currentOrderIndex = routeOrder.indexOf(Number(index));

    if (currentOrderIndex === -1) {
        return routeOrder[0];
    }

    return routeOrder[Math.min(currentOrderIndex + 1, routeOrder.length - 1)];
}

function focusAirportListRouteInput(index) {
    const targetInput = getAirportListModalInputs().find(function (input) {
        return Number(input.dataset.routeIndex) === Number(index);
    });

    if (targetInput) {
        targetInput.focus();
    }
}

function syncAirportListModalInputs() {
    const routeInputs = getRouteInputs();
    getAirportListModalInputs().forEach(function (input) {
        const index = Number(input.dataset.routeIndex);
        copyAirportInputValue(routeInputs[index], input);
    });
}

function applyAirportToRoute(airport) {
    if (!airport || !airport.icao) return false;

    const routeInputs = getRouteInputs();
    const modalInputs = getAirportListModalInputs();
    const target = routeInputs[airportListRouteIndex];
    const modalTarget = modalInputs.find(function (input) {
        return Number(input.dataset.routeIndex) === airportListRouteIndex;
    });

    if (!target) return false;

    setAirportInputValue(target, airport);
    if (modalTarget) setAirportInputValue(modalTarget, airport);
    lastFocusedRouteInput = target;
    syncRouteViewState();
    setAirportListRouteIndex(getNextAirportListRouteIndex(airportListRouteIndex));
    focusAirportListRouteInput(airportListRouteIndex);
    return true;
}

function readAirportHistory() {
    try {
        return JSON.parse(localStorage.getItem('search-history') || '[]').filter(function (item) {
            return item && item.icao && item.icao !== 'RKJK';
        });
    } catch (error) {
        return [];
    }
}

function saveAirportHistory(airport) {
    if (!airport || !airport.icao || !airport.name || !airport.nameEng) return;

    const history = readAirportHistory().filter(function (item) {
        return item.icao !== airport.icao;
    });
    history.unshift({
        icao: airport.icao,
        name: airport.name,
        nameEng: airport.nameEng
    });
    localStorage.setItem('search-history', JSON.stringify(history.slice(0, 3)));
}

function renderAirportHistory(wrapper) {
    const holder = wrapper.querySelector('.airport-query-history');
    if (!holder) return;

    const history = readAirportHistory();
    holder.innerHTML = '';

    if (history.length === 0) {
        holder.textContent = '없음.';
        return;
    }

    history.forEach(function (airport, index) {
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.icao = airport.icao;
        link.dataset.name = airport.name;
        link.dataset.nameEng = airport.nameEng;
        link.textContent = `${airport.name}(${airport.icao})`;
        holder.appendChild(link);
        if (index < history.length - 1) holder.append(', ');
    });
}

function findAirports(query) {
    const data = getAirportData();
    const normalizedQuery = normalizeAirportText(query);

    if (!normalizedQuery) return [];

    return data.airports.filter(function (airport) {
        return [
            airport.icao,
            airport.name,
            airport.nameEng,
            airport.country,
            airport.countryEng
        ].some(function (value) {
            return normalizeAirportText(value).includes(normalizedQuery);
        });
    });
}

function getOrCreateRouteAirportSuggestList(input) {
    const box = input.closest('.airportweather-world-search');
    if (!box) return null;

    let list = box.querySelector('.route-airport-suggest-list');
    if (!list) {
        list = document.createElement('ul');
        list.className = 'route-airport-suggest-list';
        box.appendChild(list);
    }
    return list;
}

function hideRouteAirportSuggestList(input) {
    const list = input ? input.closest('.airportweather-world-search')?.querySelector('.route-airport-suggest-list') : null;
    if (list) {
        list.innerHTML = '';
        list.style.display = 'none';
    }
}

function getRouteAirportSuggestionItems(input) {
    const list = input ? input.closest('.airportweather-world-search')?.querySelector('.route-airport-suggest-list') : null;
    if (!list || list.style.display === 'none') return [];

    return Array.from(list.querySelectorAll('a.route-airport-suggest-item'));
}

function setRouteAirportSuggestionActiveIndex(input, index) {
    const items = getRouteAirportSuggestionItems(input);
    if (items.length === 0) return -1;

    const nextIndex = ((index % items.length) + items.length) % items.length;
    items.forEach(function (item, itemIndex) {
        const isActive = itemIndex === nextIndex;
        item.classList.toggle('is-keyboard-active', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) item.scrollIntoView({ block: 'nearest' });
    });

    return nextIndex;
}

function clearRouteAirportSuggestionActive(input) {
    getRouteAirportSuggestionItems(input).forEach(function (item) {
        item.classList.remove('is-keyboard-active');
        item.setAttribute('aria-selected', 'false');
    });
}

function selectRouteAirportSuggestion(input, airport) {
    if (!input || !airport) return;

    setAirportInputValue(input, airport);
    lastFocusedRouteInput = input;
    routeSearchCommitted = false;
    syncRouteViewState();
    hideRouteAirportSuggestList(input);
    input.focus();
}

function renderRouteAirportSuggestions(input) {
    const list = getOrCreateRouteAirportSuggestList(input);
    if (!list) return;

    const query = input.value.trim();
    const results = findAirports(query).slice(0, 8);
    list.innerHTML = '';

    if (!query || results.length === 0) {
        list.style.display = 'none';
        return;
    }

    results.forEach(function (airport) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'route-airport-suggest-item';
        link.dataset.icao = airport.icao;
        link.dataset.name = airport.name;
        link.dataset.nameEng = airport.nameEng;
        link.textContent = `${airport.name}(${airport.icao}) - ${airport.country}`;
        link.addEventListener('mousedown', function (event) {
            event.preventDefault();
        });
        link.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            selectRouteAirportSuggestion(input, airport);
        });
        item.appendChild(link);
        list.appendChild(item);
    });

    list.style.display = 'block';
}

function initRouteInputAutocomplete() {
    getRouteInputs().forEach(function (input) {
        let activeSuggestionIndex = -1;
        input.setAttribute('autocomplete', 'off');

        input.addEventListener('input', function () {
            clearAirportInputMeta(input);
            activeSuggestionIndex = -1;
            routeSearchCommitted = false;
            syncRouteViewState();
            renderRouteAirportSuggestions(input);
        });

        input.addEventListener('focus', function () {
            lastFocusedRouteInput = input;
            if (input.value.trim()) renderRouteAirportSuggestions(input);
        });

        input.addEventListener('keydown', function (event) {
            const suggestionItems = getRouteAirportSuggestionItems(input);

            if (event.key === 'ArrowDown' && suggestionItems.length > 0) {
                event.preventDefault();
                activeSuggestionIndex = setRouteAirportSuggestionActiveIndex(input, activeSuggestionIndex + 1);
                return;
            }

            if (event.key === 'ArrowUp' && suggestionItems.length > 0) {
                event.preventDefault();
                activeSuggestionIndex = setRouteAirportSuggestionActiveIndex(input, activeSuggestionIndex - 1);
                return;
            }

            if (event.key === 'Enter' && suggestionItems.length > 0) {
                event.preventDefault();
                const activeItem = suggestionItems[activeSuggestionIndex >= 0 ? activeSuggestionIndex : 0];
                selectRouteAirportSuggestion(input, {
                    icao: activeItem.dataset.icao,
                    name: activeItem.dataset.name,
                    nameEng: activeItem.dataset.nameEng
                });
                activeSuggestionIndex = -1;
                return;
            }

            if (event.key === 'Escape') {
                hideRouteAirportSuggestList(input);
                activeSuggestionIndex = -1;
                clearRouteAirportSuggestionActive(input);
            }
        });
    });

    document.addEventListener('click', function (event) {
        if (event.target.closest('.route-airport-suggest-list')) return;
        getRouteInputs().forEach(hideRouteAirportSuggestList);
    });
}

function populateAirportSelects(wrapper) {
    const data = getAirportData();
    const countrySelect = wrapper.querySelector('select[name="country"]');
    const airportSelect = wrapper.querySelector('select[name="airport"]');
    if (!countrySelect || !airportSelect || countrySelect.dataset.loaded === 'true') return;

    countrySelect.innerHTML = '';
    data.countries.forEach(function (country) {
        const option = document.createElement('option');
        option.value = country.value;
        option.dataset.name = country.name;
        option.dataset.nameEng = country.nameEng;
        option.textContent = country.name;
        if (country.value === '대한민국') option.selected = true;
        countrySelect.appendChild(option);
    });
    countrySelect.dataset.loaded = 'true';
    populateAirportOptions(wrapper);
}

function populateAirportOptions(wrapper) {
    const data = getAirportData();
    const countrySelect = wrapper.querySelector('select[name="country"]');
    const airportSelect = wrapper.querySelector('select[name="airport"]');
    if (!countrySelect || !airportSelect) return;

    const airports = data.airportsByCountry[countrySelect.value] || [];
    airportSelect.innerHTML = '';

    airports.forEach(function (airport) {
        const option = document.createElement('option');
        option.value = airport.icao;
        option.dataset.name = airport.name;
        option.dataset.nameEng = airport.nameEng;
        option.textContent = airport.name;
        if (airport.icao === 'RKSI') option.selected = true;
        airportSelect.appendChild(option);
    });
}

function readSelectedAirportFromSelect(wrapper) {
    const airportSelect = wrapper.querySelector('select[name="airport"]');
    if (!airportSelect || !airportSelect.value) return null;

    const option = airportSelect.options[airportSelect.selectedIndex];
    return {
        icao: airportSelect.value,
        name: option?.dataset.name || option?.textContent || airportSelect.value,
        nameEng: option?.dataset.nameEng || option?.textContent || airportSelect.value
    };
}

function applySelectedAirportFromSelect(wrapper) {
    const airport = readSelectedAirportFromSelect(wrapper);
    if (!airport) return false;

    saveAirportHistory(airport);
    renderAirportHistory(wrapper);
    return applyAirportToRoute(airport);
}

function initAirportSearchForm(wrapper) {
    const selectBox = wrapper.querySelector('.airport-search-select');
    const searchButton = wrapper.querySelector('button[name="search"], button.input-submit[type="submit"], button.input-submit');
    let selectedAirport = null;
    let lastSelectApplyIcao = '';

    if (selectBox) selectBox.style.display = '';

    function applySelectAirportChoice() {
        const airport = readSelectedAirportFromSelect(wrapper);
        if (!airport) return false;

        if (lastSelectApplyIcao === airport.icao) {
            return true;
        }

        lastSelectApplyIcao = airport.icao;
        selectedAirport = airport;
        return applySelectedAirportFromSelect(wrapper);
    }

    function applySingleAirportOption() {
        const airportSelect = wrapper.querySelector('select[name="airport"]');
        if (!airportSelect || airportSelect.options.length !== 1 || !airportSelect.value) return false;

        return applySelectAirportChoice();
    }

    wrapper.addEventListener('click', function (event) {
        const historyLink = event.target.closest('.airport-query-history a');

        if (historyLink) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
            selectedAirport = {
                icao: historyLink.dataset.icao,
                name: historyLink.dataset.name,
                nameEng: historyLink.dataset.nameEng
            };
            applyAirportToRoute(selectedAirport);
        }
    });

    wrapper.querySelectorAll('select[name="country"], select[name="airport"]').forEach(function (select) {
        select.addEventListener('change', function () {
            if (select.name === 'country') {
                populateAirportOptions(wrapper);
                lastSelectApplyIcao = '';
            }
            selectedAirport = readSelectedAirportFromSelect(wrapper);
            if (select.name === 'airport' && selectedAirport) {
                applySelectAirportChoice();
            }
        });

        select.addEventListener('mousedown', function () {
            if (select.name !== 'airport') return;

            applySingleAirportOption();
        });

        select.addEventListener('click', function () {
            if (select.name !== 'airport') return;

            applySingleAirportOption();
        });

        select.addEventListener('keydown', function (event) {
            if (select.name !== 'airport' || !['Enter', ' '].includes(event.key)) return;

            applySingleAirportOption();
        });
    });

    wrapper.querySelectorAll('.btn-select').forEach(function (button) {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            populateAirportOptions(wrapper);
            selectedAirport = readSelectedAirportFromSelect(wrapper);
            if (selectedAirport) applySelectAirportChoice();
        });
    });

    searchButton?.addEventListener('click', function (event) {
        event.preventDefault();

        applySelectAirportChoice();

        if (!hasRequiredRoute()) {
            alert('출발공항과 도착공항을 선택하세요.');
            const emptyInput = getAirportListModalInputs().find(function (input) {
                return input.offsetParent !== null && input.value.trim() === '';
            });
            emptyInput?.focus();
            return;
        }

        syncRouteSearchSubmit(event);
        closeModal('airport-list-modal');
    });

    wrapper.closest('#airport-list-modal')?.addEventListener('airport-list-modal:open', function () {
        lastSelectApplyIcao = '';
    });

    populateAirportSelects(wrapper);
    selectedAirport = readSelectedAirportFromSelect(wrapper);
    renderAirportHistory(wrapper);
}

function openAirportListModal(index) {
    syncAirportListModalInputs();
    setAirportListRouteIndex(index);
    openModal('airport-list-modal');

    const modal = document.getElementById('airport-list-modal');
    modal?.dispatchEvent(new Event('airport-list-modal:open'));
    const airportSelect = modal?.querySelector('.airport-search-select select[name="airport"]');
    airportSelect?.focus();
}

function initAirportListModalSearch() {
    const modal = document.getElementById('airport-list-modal');
    if (!modal) return;

    getRouteInputs().forEach(function (input, index) {
        input.dataset.routeIndex = index;
        input.addEventListener('focus', function () {
            lastFocusedRouteInput = input;
            setAirportListRouteIndex(index);
        });
        input.addEventListener('click', function () {
            lastFocusedRouteInput = input;
            setAirportListRouteIndex(index);
        });
    });

    getAirportListModalInputs().forEach(function (input) {
        input.addEventListener('focus', function () {
            setAirportListRouteIndex(input.dataset.routeIndex);
        });
        input.addEventListener('click', function () {
            setAirportListRouteIndex(input.dataset.routeIndex);
        });
        input.addEventListener('input', function () {
            const routeInputs = getRouteInputs();
            const routeInput = routeInputs[Number(input.dataset.routeIndex)];
            clearAirportInputMeta(input);
            if (routeInput) {
                routeInput.value = input.value.toUpperCase();
                clearAirportInputMeta(routeInput);
            }
        });
    });

    document.querySelectorAll('.route-airport-list-btn').forEach(function (button) {
        button.addEventListener('click', function () {
            const routeInputs = getRouteInputs();
            const focusedIndex = routeInputs.indexOf(lastFocusedRouteInput);
            openAirportListModal(focusedIndex >= 0 ? focusedIndex : 0);
        });
    });

    modal.querySelectorAll('.main_sls_form').forEach(initAirportSearchForm);
    setAirportListRouteIndex(0);
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
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open');
    switchModalTab(modalId, tabIndex);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
}

function switchModalTab(modalId, index) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
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
function initZoomImages() {
    const MIN_SCALE = 1;
    const MAX_SCALE = 4;
    const STEP = 0.25;

    document.querySelectorAll('.zoom-box').forEach(function (box) {
        if (box.dataset.zoomReady === 'true') return;

        const viewport = box.querySelector('.zoom-img');
        const image = viewport?.querySelector('img');
        const zoomIn = box.querySelector('.jvectormap-zoomin');
        const zoomOut = box.querySelector('.jvectormap-zoomout');
        if (!viewport || !image || !zoomIn || !zoomOut) return;

        let scale = MIN_SCALE;
        let x = 0;
        let y = 0;
        let dragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let startX = 0;
        let startY = 0;

        function clampPosition() {
            const viewWidth = viewport.clientWidth;
            const viewHeight = viewport.clientHeight;
            const imageWidth = image.offsetWidth * scale;
            const imageHeight = image.offsetHeight * scale;
            const minX = Math.min(0, viewWidth - imageWidth);
            const minY = Math.min(0, viewHeight - imageHeight);

            x = Math.max(minX, Math.min(0, x));
            y = Math.max(minY, Math.min(0, y));

            if (imageWidth <= viewWidth) x = 0;
            if (imageHeight <= viewHeight) y = 0;
        }

        function applyZoom() {
            clampPosition();
            image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            viewport.classList.toggle('is-zoomed', scale > MIN_SCALE);
        }

        function setScale(nextScale) {
            const previousScale = scale;
            scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));

            if (scale === MIN_SCALE) {
                x = 0;
                y = 0;
            } else if (previousScale !== scale) {
                const rect = viewport.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const ratio = scale / previousScale;
                x = centerX - (centerX - x) * ratio;
                y = centerY - (centerY - y) * ratio;
            }

            applyZoom();
        }

        zoomIn.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            setScale(scale + STEP);
        });

        zoomOut.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            setScale(scale - STEP);
        });

        viewport.addEventListener('wheel', function (event) {
            event.preventDefault();
            setScale(scale + (event.deltaY < 0 ? STEP : -STEP));
        }, { passive: false });

        viewport.addEventListener('pointerdown', function (event) {
            if (scale <= MIN_SCALE) return;

            event.preventDefault();
            dragging = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            startX = x;
            startY = y;
            viewport.classList.add('is-dragging');
            viewport.setPointerCapture?.(event.pointerId);
        });

        viewport.addEventListener('pointermove', function (event) {
            if (!dragging) return;

            event.preventDefault();
            x = startX + event.clientX - dragStartX;
            y = startY + event.clientY - dragStartY;
            applyZoom();
        });

        function stopDragging(event) {
            if (!dragging) return;

            dragging = false;
            viewport.classList.remove('is-dragging');
            if (event?.pointerId !== undefined) viewport.releasePointerCapture?.(event.pointerId);
        }

        viewport.addEventListener('pointerup', stopDragging);
        viewport.addEventListener('pointercancel', stopDragging);
        viewport.addEventListener('lostpointercapture', stopDragging);
        image.addEventListener('load', applyZoom);
        window.addEventListener('resize', applyZoom);

        box.dataset.zoomReady = 'true';
        applyZoom();
    });
}

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
initRouteInputAutocomplete();
initAirportListModalSearch();
initFlightTypeOptionClicks();
initMapOpenToggle();
initMapTabButtons();
initModalOverlayClose();
initZoomImages();
initAirportWeatherPortRadios();

syncAirportWeatherStopover(isStopoverRoute());
syncRouteViewState();