/**
 * Masking Remover - 수업용 가림판 및 순차 공개 도구
 * Core Application Engine
 */

class MaskingRemoverApp {
  constructor() {
    // 앱 모드 및 스타일 상태
    this.mode = 'draw'; // 'draw' | 'present'
    this.activeStyle = 'slate'; // 'slate' | 'sticky' | 'blue' | 'hint'
    this.zoom = 1.0;
    
    // 문서 상태
    this.docType = 'sample'; // 'sample' | 'image' | 'pdf'
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 1;
    this.currentImage = null;

    // 마스킹 데이터 (페이지별 배열 보관)
    // 구조: { [pageNum: number]: Array<{ id, order, x, y, w, h, style, text, isRevealed }> }
    this.pageMasks = { 1: [] };
    this.revealHistory = []; // 순차 공개 히스토리 (마스크 ID 배열)

    // 단어 카드 포커스 모드 상태
    this.isWordCardOpen = false;
    this.currentCardIndex = 0;

    // 드로잉 인터랙션 상태
    this.isDrawing = false;
    this.drawStart = { x: 0, y: 0 };
    this.activeDrawingRect = null;
    this.draggedMaskRowId = null;

    // 오디오 컨텍스트 (효과음용)
    this.audioCtx = null;

    // DOM 요소 캐시
    this.initDOMElements();

    // 이벤트 리스너 등록
    this.bindEvents();

    // 기본 샘플 학습지 로드
    this.loadSampleWorksheet();

    // 로컬 템플릿 보관함 목록 초기화
    this.initLocalPresets();

    // 진행 상황 패널을 상단 우측(빨간 네모 박스 위치)으로 초기 고정
    this.resetPresentationBarPosition();
  }

  /* -------------------------------------------------------------
   * 1. DOM 요소 캐싱
   * ----------------------------------------------------------- */
  initDOMElements() {
    this.viewportContainer = document.getElementById('viewportContainer');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.renderCanvas = document.getElementById('renderCanvas');
    this.ctx = this.renderCanvas.getContext('2d');
    this.maskOverlay = document.getElementById('maskOverlay');

    // 헤더 및 툴바
    this.modeDrawBtn = document.getElementById('modeDrawBtn');
    this.modePresentBtn = document.getElementById('modePresentBtn');
    this.wordCardModeBtn = document.getElementById('wordCardModeBtn');
    this.fileInput = document.getElementById('fileInput');
    this.uploadBtn = document.getElementById('uploadBtn');
    this.zoomInBtn = document.getElementById('zoomInBtn');
    this.zoomOutBtn = document.getElementById('zoomOutBtn');
    this.zoomResetBtn = document.getElementById('zoomResetBtn');
    this.zoomLevelText = document.getElementById('zoomLevelText');
    this.fitPageBtn = document.getElementById('fitPageBtn');
    this.fitWidthBtn = document.getElementById('fitWidthBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.helpBtn = document.getElementById('helpBtn');
    this.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    this.sidebar = document.getElementById('sidebar');

    // PDF 네비게이션
    this.pdfNavBar = document.getElementById('pdfNavBar');
    this.prevPageBtn = document.getElementById('prevPageBtn');
    this.nextPageBtn = document.getElementById('nextPageBtn');
    this.pageIndicator = document.getElementById('pageIndicator');

    // 사이드바 컨트롤 & 템플릿 보관함
    this.maskCountBadge = document.getElementById('maskCountBadge');
    this.maskListContainer = document.getElementById('maskListContainer');
    this.clearAllMasksBtn = document.getElementById('clearAllMasksBtn');
    this.styleButtons = document.querySelectorAll('.style-picker-btn');
    this.presetNameInput = document.getElementById('presetNameInput');
    this.saveLocalPresetBtn = document.getElementById('saveLocalPresetBtn');
    this.presetSelect = document.getElementById('presetSelect');
    this.loadLocalPresetBtn = document.getElementById('loadLocalPresetBtn');
    this.deleteLocalPresetBtn = document.getElementById('deleteLocalPresetBtn');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.importJsonBtn = document.getElementById('importJsonBtn');
    this.jsonFileInput = document.getElementById('jsonFileInput');

    // 하단 프레젠테이션 컨트롤러
    this.presentationBar = document.getElementById('presentationBar');
    this.barDragHandle = document.getElementById('barDragHandle');
    this.prevRevealBtn = document.getElementById('prevRevealBtn');
    this.nextRevealBtn = document.getElementById('nextRevealBtn');
    this.hideAllBtn = document.getElementById('hideAllBtn');
    this.revealAllBtn = document.getElementById('revealAllBtn');
    this.progressRatioText = document.getElementById('progressRatioText');
    this.progressFill = document.getElementById('progressFill');

    // 단어 카드 포커스 모달 요소
    this.wordCardBackdrop = document.getElementById('wordCardBackdrop');
    this.closeWordCardBtn = document.getElementById('closeWordCardBtn');
    this.wordCardMain = document.getElementById('wordCardMain');
    this.wordCardNum = document.getElementById('wordCardNum');
    this.wordCardLabel = document.getElementById('wordCardLabel');
    this.wordCardText = document.getElementById('wordCardText');
    this.wordCardCropCanvas = document.getElementById('wordCardCropCanvas');
    this.wordCardCropCtx = this.wordCardCropCanvas.getContext('2d');
    this.wordCardStateHint = document.getElementById('wordCardStateHint');
    this.prevWordCardBtn = document.getElementById('prevWordCardBtn');
    this.toggleWordCardBtn = document.getElementById('toggleWordCardBtn');
    this.nextWordCardBtn = document.getElementById('nextWordCardBtn');
    this.wordCardProgress = document.getElementById('wordCardProgress');

    // 도움말 모달 및 오버레이
    this.helpModal = document.getElementById('helpModal');
    this.closeHelpBtn = document.getElementById('closeHelpBtn');
    this.dragDropOverlay = document.getElementById('dragDropOverlay');
    this.toastContainer = document.getElementById('toastContainer');
  }

  /* -------------------------------------------------------------
   * 2. 이벤트 바인딩
   * ----------------------------------------------------------- */
  bindEvents() {
    // 모드 전환
    this.modeDrawBtn.addEventListener('click', () => this.setMode('draw'));
    this.modePresentBtn.addEventListener('click', () => this.setMode('present'));
    this.wordCardModeBtn.addEventListener('click', () => this.openWordCard());

    // 사이드바 토글
    this.toggleSidebarBtn.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
      requestAnimationFrame(() => this.fitToWidth());
    });

    // 파일 업로드
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // 드래그 앤 드롭 파일 로딩 (외부 OS 파일 드래그 시에만 파일 드롭 오버레이 활성화)
    window.addEventListener('dragover', (e) => {
      // 내부 마스크 순서 변경 드래그 중인 경우 파일 드롭 오버레이 절대 띄우지 않음
      if (this.draggedMaskRowId) return;

      const types = e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
      if (!types.includes('Files')) return;

      e.preventDefault();
      this.dragDropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null || e.clientX <= 0 || e.clientY <= 0) {
        this.dragDropOverlay.classList.remove('active');
      }
    });

    window.addEventListener('drop', (e) => {
      if (this.draggedMaskRowId) return;

      const types = e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
      if (!types.includes('Files')) return;

      e.preventDefault();
      this.dragDropOverlay.classList.remove('active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadFile(e.dataTransfer.files[0]);
      }
    });

    // 줌 조절 버튼
    this.zoomInBtn.addEventListener('click', () => this.setZoom(this.zoom + 0.15));
    this.zoomOutBtn.addEventListener('click', () => this.setZoom(this.zoom - 0.15));
    this.zoomResetBtn.addEventListener('click', () => this.setZoom(1.0));
    this.fitPageBtn.addEventListener('click', () => this.fitToPage());
    this.fitWidthBtn.addEventListener('click', () => this.fitToWidth());

    // 전체화면 및 자동 화면 전체 맞춤 (문서 상하좌우 잘림 방지)
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = !!document.fullscreenElement;
      if (isFullscreen) {
        document.body.classList.add('is-fullscreen');
        this.sidebar.classList.add('collapsed');
      } else {
        document.body.classList.remove('is-fullscreen');
        if (this.mode === 'draw') {
          this.sidebar.classList.remove('collapsed');
        } else {
          this.sidebar.classList.add('collapsed');
        }
      }
      setTimeout(() => this.fitToPage(), 100);
    });

    // 창 크기 조절 시 화면 전체 맞춤 동기화
    window.addEventListener('resize', () => {
      this.fitToPage();
    });

    // Ctrl + 마우스 휠을 이용한 화면 확대/축소
    this.viewportContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        this.setZoom(this.zoom + delta);
      }
    }, { passive: false });

    // 마스킹 스타일 선택
    this.styleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.styleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeStyle = btn.getAttribute('data-style');
      });
    });

    // 마스크 오버레이 Pointer Events (그리기 인터랙션)
    this.maskOverlay.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));

    // 하단 순차 공개 컨트롤러
    this.nextRevealBtn.addEventListener('click', () => this.revealNext());
    this.prevRevealBtn.addEventListener('click', () => this.restorePrev());
    this.hideAllBtn.addEventListener('click', () => this.hideAll());
    this.revealAllBtn.addEventListener('click', () => this.revealAll());

    // 단어 카드 모달 컨트롤러
    this.closeWordCardBtn.addEventListener('click', () => this.closeWordCard());
    this.wordCardMain.addEventListener('click', () => this.toggleWordCardContent());
    this.toggleWordCardBtn.addEventListener('click', () => this.toggleWordCardContent());
    this.nextWordCardBtn.addEventListener('click', () => this.nextWordCard());
    this.prevWordCardBtn.addEventListener('click', () => this.prevWordCard());
    this.wordCardBackdrop.addEventListener('click', (e) => {
      if (e.target === this.wordCardBackdrop) this.closeWordCard();
    });

    // 사이드바 액션 & 템플릿 보관함
    this.clearAllMasksBtn.addEventListener('click', () => this.clearAllMasks());
    this.saveLocalPresetBtn.addEventListener('click', () => this.saveLocalPreset());
    this.loadLocalPresetBtn.addEventListener('click', () => this.loadLocalPreset());
    this.deleteLocalPresetBtn.addEventListener('click', () => this.deleteLocalPreset());
    this.exportJsonBtn.addEventListener('click', () => this.exportToJson());
    this.importJsonBtn.addEventListener('click', () => this.jsonFileInput.click());
    this.jsonFileInput.addEventListener('change', (e) => this.importFromJson(e));

    // PDF 네비게이션
    this.prevPageBtn.addEventListener('click', () => this.changePage(this.currentPage - 1));
    this.nextPageBtn.addEventListener('click', () => this.changePage(this.currentPage + 1));

    // 도움말 모달
    this.helpBtn.addEventListener('click', () => this.helpModal.classList.add('open'));
    this.closeHelpBtn.addEventListener('click', () => this.helpModal.classList.remove('open'));
    this.helpModal.addEventListener('click', (e) => {
      if (e.target === this.helpModal) this.helpModal.classList.remove('open');
    });

    // 키보드 단축키
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 진행상황 패널 마우스/터치 드래그앤드롭 이동 초기화
    this.initDraggablePresentationBar();
  }

  /* -------------------------------------------------------------
   * 3. 모드 및 뷰 제어
   * ----------------------------------------------------------- */
  setMode(mode) {
    this.mode = mode;
    if (mode === 'draw') {
      this.modeDrawBtn.classList.add('active');
      this.modePresentBtn.classList.remove('active');
      this.viewportContainer.classList.add('mode-draw');
      // 편집 모드에서는 사이드바가 열려 편리하게 작업
      this.sidebar.classList.remove('collapsed');
      this.showToast('가림판 그리기(편집) 모드');
    } else {
      this.modeDrawBtn.classList.remove('active');
      this.modePresentBtn.classList.add('active');
      this.viewportContainer.classList.remove('mode-draw');
      // 전체 수업 진행 모드에서는 사이드바를 왼쪽으로 안 보이게 자동 숨김!
      this.sidebar.classList.add('collapsed');
      this.showToast('수업 진행 모드: Space 또는 → 키로 순서대로 지웁니다.');
    }
    requestAnimationFrame(() => this.fitToPage());
  }

  updateCanvasDimensions(w, h) {
    this.renderCanvas.width = w;
    this.renderCanvas.height = h;
    this.renderCanvas.style.width = `${w}px`;
    this.renderCanvas.style.height = `${h}px`;
    this.canvasWrapper.style.width = `${w}px`;
    this.canvasWrapper.style.height = `${h}px`;
    this.maskOverlay.style.width = `${w}px`;
    this.maskOverlay.style.height = `${h}px`;
  }

  setZoom(value) {
    this.zoom = Math.max(0.2, Math.min(3.0, Math.round(value * 100) / 100));
    this.canvasWrapper.style.transform = `scale(${this.zoom})`;
    this.zoomLevelText.textContent = `${Math.round(this.zoom * 100)}%`;

    // 줌 배율(scale) 적용 시 브라우저 스크롤 영역이 잘리지 않도록 동적 마진 확보
    const baseHeight = this.renderCanvas.height || 720;
    const baseWidth = this.renderCanvas.width || 1000;
    const scaledHeight = baseHeight * this.zoom;
    const scaledWidth = baseWidth * this.zoom;

    const extraHeight = Math.max(0, scaledHeight - baseHeight);
    const extraWidth = Math.max(0, scaledWidth - baseWidth);

    // 하단에 넉넉한 여백(extraHeight + 100px)을 부여하여 문서 맨 아래 끝까지 시원하게 스크롤 보장
    this.canvasWrapper.style.marginBottom = `${extraHeight + 100}px`;
    if (extraWidth > 0) {
      this.canvasWrapper.style.marginLeft = `${extraWidth / 2}px`;
      this.canvasWrapper.style.marginRight = `${extraWidth / 2}px`;
    } else {
      this.canvasWrapper.style.marginLeft = '0px';
      this.canvasWrapper.style.marginRight = '0px';
    }
  }

  fitToPage() {
    if (!this.renderCanvas.width || !this.renderCanvas.height) return;
    // 가로/세로 여백 40px 확보하여 문서 테두리 그림자까지 잘림 없이 표시
    const availableWidth = Math.max(100, this.viewportContainer.clientWidth - 48);
    const availableHeight = Math.max(100, this.viewportContainer.clientHeight - 48);

    const scaleX = availableWidth / this.renderCanvas.width;
    const scaleY = availableHeight / this.renderCanvas.height;

    // 가로/세로 중 화면 안에 100% 들어오도록 작은 배율 선택 (문서 상하좌우 완전 노출)
    const fitZoom = Math.min(scaleX, scaleY);
    this.setZoom(fitZoom);
  }

  fitToWidth() {
    if (!this.renderCanvas.width) return;
    const availableWidth = this.viewportContainer.clientWidth - 48;
    const canvasWidth = this.renderCanvas.width;
    if (availableWidth <= 0 || canvasWidth <= 0) return;
    const calculatedZoom = availableWidth / canvasWidth;
    this.setZoom(calculatedZoom);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.body.classList.add('is-fullscreen');
      this.sidebar.classList.add('collapsed');
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  initDraggablePresentationBar() {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    // 핸들 더블클릭 시 우측 하단 기본 고정 위치(빨간 네모 박스)로 초기화
    if (this.barDragHandle) {
      this.barDragHandle.addEventListener('dblclick', () => {
        this.resetPresentationBarPosition();
      });
    }

    const onPointerDown = (e) => {
      // 드래그 핸들(#barDragHandle)을 잡고 끌 때만 이동 허용 (버튼 조작 시 의도치 않은 패널 이동 방지)
      if (!e.target.closest('#barDragHandle')) return;

      isDragging = true;
      this.presentationBar.classList.add('is-dragging');
      this.presentationBar.setPointerCapture(e.pointerId);

      const rect = this.presentationBar.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;

      this.presentationBar.style.transform = 'none';
      this.presentationBar.style.bottom = 'auto';
      this.presentationBar.style.right = 'auto';
      this.presentationBar.style.left = `${initialLeft}px`;
      this.presentationBar.style.top = `${initialTop}px`;

      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const barW = this.presentationBar.offsetWidth;
      const barH = this.presentationBar.offsetHeight;
      const maxLeft = window.innerWidth - barW - 10;
      const maxTop = window.innerHeight - barH - 10;

      newLeft = Math.max(10, Math.min(maxLeft, newLeft));
      newTop = Math.max(10, Math.min(maxTop, newTop));

      this.presentationBar.style.left = `${newLeft}px`;
      this.presentationBar.style.top = `${newTop}px`;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      this.presentationBar.classList.remove('is-dragging');
      try {
        this.presentationBar.releasePointerCapture(e.pointerId);
      } catch {}
    };

    this.presentationBar.addEventListener('pointerdown', onPointerDown);
    this.presentationBar.addEventListener('pointermove', onPointerMove);
    this.presentationBar.addEventListener('pointerup', onPointerUp);
    this.presentationBar.addEventListener('pointercancel', onPointerUp);
  }

  resetPresentationBarPosition() {
    this.presentationBar.style.transform = 'none';
    this.presentationBar.style.left = 'auto';
    this.presentationBar.style.bottom = 'auto';
    this.presentationBar.style.top = '12px';
    this.presentationBar.style.right = '24px';
  }

  /* -------------------------------------------------------------
   * 4. 파일 처리 (PDF & 이미지)
   * ----------------------------------------------------------- */
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadFile(file);
      e.target.value = '';
    }
  }

  loadFile(file) {
    const fileName = file.name.toLowerCase();

    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      this.loadPdfFile(file);
    } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName)) {
      this.loadImageFile(file);
    } else {
      this.showToast('지원하지 않는 파일 형식입니다. PDF 또는 이미지를 선택하세요.', 'error');
    }
  }

  loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.docType = 'image';
        this.currentImage = img;
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.pdfNavBar.style.display = 'none';

        if (!this.pageMasks[1]) {
          this.pageMasks[1] = [];
        }

        this.renderImage(img);
        this.fitToPage();
        this.renderMasks();
        this.updateUI();
        this.showToast(`이미지 로드 완료: ${file.name}`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  renderImage(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    this.updateCanvasDimensions(w, h);
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(img, 0, 0);
  }

  async loadPdfFile(file) {
    if (!window.pdfjsLib) {
      this.showToast('PDF.js 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdfDoc = await loadingTask.promise;
      this.docType = 'pdf';
      this.currentImage = null;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;

      this.pdfNavBar.style.display = 'flex';
      await this.renderPdfPage(this.currentPage);
      this.fitToPage();
      this.showToast(`PDF 로드 완료: ${file.name} (총 ${this.totalPages}페이지)`);
    } catch (err) {
      console.error('PDF 로드 실패:', err);
      this.showToast('PDF 파일을 불러오지 못했습니다.', 'error');
    }
  }

  async renderPdfPage(pageNum) {
    if (!this.pdfDoc) return;
    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const w = viewport.width;
      const h = viewport.height;
      this.updateCanvasDimensions(w, h);
      this.ctx.clearRect(0, 0, w, h);

      const renderContext = {
        canvasContext: this.ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      this.pageIndicator.textContent = `${this.currentPage} / ${this.totalPages}`;
      if (!this.pageMasks[this.currentPage]) {
        this.pageMasks[this.currentPage] = [];
      }

      this.renderMasks();
      this.updateUI();
    } catch (err) {
      console.error('페이지 렌더링 오류:', err);
    }
  }

  changePage(pageNum) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPage = pageNum;
    this.revealHistory = [];
    this.renderPdfPage(this.currentPage);
  }

  /* -------------------------------------------------------------
   * 5. 샘플 학습지 캔버스 생성 (초기 시연용)
   * ----------------------------------------------------------- */
  loadSampleWorksheet() {
    const w = 1000;
    const h = 720;
    this.updateCanvasDimensions(w, h);

    const c = this.ctx;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);

    // 상단 헤더 배너
    c.fillStyle = '#f1f5f9';
    c.fillRect(40, 20, w - 80, 70);
    c.strokeStyle = '#cbd5e1';
    c.lineWidth = 2;
    c.strokeRect(40, 20, w - 80, 70);

    c.fillStyle = '#1e293b';
    c.font = 'bold 24px "Pretendard", sans-serif';
    c.fillText('📖 [수업 예시] 오늘의 핵심 단어 & 퀴즈', 65, 55);

    c.fillStyle = '#64748b';
    c.font = '14px "Pretendard", sans-serif';
    c.fillText('가림판을 더블클릭하여 텍스트를 입력하거나, [단어 카드(C)]로 포커스 퀴즈를 진행해보세요!', 65, 76);

    // 문제 1: 과학 퀴즈
    c.fillStyle = '#0f172a';
    c.font = 'bold 19px "Pretendard", sans-serif';
    c.fillText('Q1. 빛이 직진하다가 다른 물질의 경계면에서 꺾이는 현상을 무엇이라고 할까요?', 50, 125);

    c.font = '17px "Pretendard", sans-serif';
    c.fillStyle = '#334155';
    c.fillText('정답: [  빛의 굴절 현상 (Refraction)  ]', 70, 162);
    c.fillText('설명: 매질에 따라 빛의 속력이 달라지기 때문에 발생합니다.', 70, 190);

    // 구분선
    c.beginPath();
    c.strokeStyle = '#e2e8f0';
    c.lineWidth = 1.5;
    c.moveTo(50, 215);
    c.lineTo(w - 50, 215);
    c.stroke();

    // 문제 2: 영어 빈칸 채우기
    c.fillStyle = '#0f172a';
    c.font = 'bold 19px "Pretendard", sans-serif';
    c.fillText('Q2. 다음 문장의 빈칸에 들어갈 가장 알맞은 표현을 맞춰보세요.', 50, 248);

    c.font = '17px "Pretendard", sans-serif';
    c.fillStyle = '#334155';
    c.fillText('Sentence: "Actions speak louder than [   words   ]."', 70, 285);
    c.fillText('의미: 말보다 [   행동이나 실천   ]이 훨씬 더 중요하다.', 70, 313);

    // 구분선
    c.beginPath();
    c.moveTo(50, 338);
    c.lineTo(w - 50, 338);
    c.stroke();

    // 문제 3: 역사 & 상식
    c.fillStyle = '#0f172a';
    c.font = 'bold 19px "Pretendard", sans-serif';
    c.fillText('Q3. 조선 시대에 백성을 가르치는 바른 소리라는 뜻으로 창제된 글자는?', 50, 370);

    c.font = 'bold 18px "Pretendard", sans-serif';
    c.fillStyle = '#1e3a8a';
    c.fillText('정답: [   훈민정음 (Hunminjeongeum)   ]', 70, 407);
    c.fillStyle = '#334155';
    c.font = '15px "Pretendard", sans-serif';
    c.fillText('창제자: [  세종대왕 (King Sejong)  ], 1443년 창제', 70, 437);

    // 구분선
    c.beginPath();
    c.moveTo(50, 462);
    c.lineTo(w - 50, 462);
    c.stroke();

    // 하단 장식 안내 카드
    c.fillStyle = '#f8fafc';
    c.fillRect(50, 482, w - 100, 205);
    c.strokeStyle = '#93c5fd';
    c.lineWidth = 1.5;
    c.strokeRect(50, 482, w - 100, 205);

    c.fillStyle = '#2563eb';
    c.font = 'bold 17px "Pretendard", sans-serif';
    c.fillText('💡 Masking Remover 핵심 활용 팁', 70, 515);

    c.fillStyle = '#475569';
    c.font = '14px "Pretendard", sans-serif';
    c.fillText('1. 이미 생성된 마스킹 네모 박스는 마우스로 드래그하여 화면 원하는 곳으로 자유롭게 이동할 수 있습니다.', 70, 545);
    c.fillText('2. 가림판을 더블클릭하여 텍스트를 입력하거나, 상단 [단어 카드(C)]로 2배 대형 플래시 카드 모드를 실행해보세요.', 70, 575);
    c.fillText('3. Space / 방향키(→)로 다음 가림판을 순서대로 지우고, 전체화면(F) 시 사이드바가 숨겨지며 가로 맞춤됩니다.', 70, 605);
    c.fillText('4. 교재 파일과 무관하게 왼쪽 패널의 [템플릿 보관함]을 이용해 가림판 구성을 저장하고 언제든 재사용할 수 있습니다.', 70, 635);

    // 기본 샘플 가림판 4개 등록 (텍스트 포함)
    this.pageMasks[1] = [
      {
        id: 'sample_mask_1',
        order: 1,
        x: 120 / w,
        y: 140 / h,
        w: 320 / w,
        h: 32 / h,
        style: 'slate',
        text: '빛의 굴절 현상 (Refraction)',
        isRevealed: false
      },
      {
        id: 'sample_mask_2',
        order: 2,
        x: 322 / w,
        y: 263 / h,
        w: 120 / w,
        h: 32 / h,
        style: 'sticky',
        text: 'words',
        isRevealed: false
      },
      {
        id: 'sample_mask_3',
        order: 3,
        x: 125 / w,
        y: 385 / h,
        w: 330 / w,
        h: 32 / h,
        style: 'blue',
        text: '훈민정음 (Hunminjeongeum)',
        isRevealed: false
      },
      {
        id: 'sample_mask_4',
        order: 4,
        x: 135 / w,
        y: 417 / h,
        w: 220 / w,
        h: 30 / h,
        style: 'hint',
        text: '세종대왕 (King Sejong)',
        isRevealed: false
      }
    ];

    this.renderMasks();
    this.updateUI();
    this.fitToPage();
  }

  /* -------------------------------------------------------------
   * 6. 마스킹 인터랙션 (드래그 박스 생성)
   * ----------------------------------------------------------- */
  onPointerDown(e) {
    if (this.mode !== 'draw' || e.button !== 0) return;
    if (e.target.closest('.mask-box')) return;

    const rect = this.maskOverlay.getBoundingClientRect();
    const currentScale = this.zoom;
    const startX = (e.clientX - rect.left) / currentScale;
    const startY = (e.clientY - rect.top) / currentScale;

    this.isDrawing = true;
    this.drawStart = { x: startX, y: startY };

    this.activeDrawingRect = document.createElement('div');
    this.activeDrawingRect.className = 'drawing-rect';
    this.activeDrawingRect.style.left = `${startX}px`;
    this.activeDrawingRect.style.top = `${startY}px`;
    this.activeDrawingRect.style.width = '0px';
    this.activeDrawingRect.style.height = '0px';
    this.maskOverlay.appendChild(this.activeDrawingRect);

    e.preventDefault();
  }

  onPointerMove(e) {
    if (!this.isDrawing || !this.activeDrawingRect) return;

    const rect = this.maskOverlay.getBoundingClientRect();
    const currentScale = this.zoom;
    const currentX = (e.clientX - rect.left) / currentScale;
    const currentY = (e.clientY - rect.top) / currentScale;

    const x = Math.min(this.drawStart.x, currentX);
    const y = Math.min(this.drawStart.y, currentY);
    const w = Math.abs(currentX - this.drawStart.x);
    const h = Math.abs(currentY - this.drawStart.y);

    this.activeDrawingRect.style.left = `${x}px`;
    this.activeDrawingRect.style.top = `${y}px`;
    this.activeDrawingRect.style.width = `${w}px`;
    this.activeDrawingRect.style.height = `${h}px`;
  }

  onPointerUp(e) {
    if (!this.isDrawing || !this.activeDrawingRect) return;
    this.isDrawing = false;

    const rect = this.maskOverlay.getBoundingClientRect();
    const currentScale = this.zoom;
    const currentX = (e.clientX - rect.left) / currentScale;
    const currentY = (e.clientY - rect.top) / currentScale;

    const overlayW = this.maskOverlay.clientWidth;
    const overlayH = this.maskOverlay.clientHeight;

    const pixelX = Math.min(this.drawStart.x, currentX);
    const pixelY = Math.min(this.drawStart.y, currentY);
    const pixelW = Math.abs(currentX - this.drawStart.x);
    const pixelH = Math.abs(currentY - this.drawStart.y);

    if (this.activeDrawingRect.parentNode) {
      this.activeDrawingRect.parentNode.removeChild(this.activeDrawingRect);
    }
    this.activeDrawingRect = null;

    if (pixelW < 14 || pixelH < 14) return;

    const newMask = {
      id: 'mask_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      order: (this.pageMasks[this.currentPage]?.length || 0) + 1,
      x: Math.max(0, Math.min(1, pixelX / overlayW)),
      y: Math.max(0, Math.min(1, pixelY / overlayH)),
      w: Math.max(0, Math.min(1, pixelW / overlayW)),
      h: Math.max(0, Math.min(1, pixelH / overlayH)),
      style: this.activeStyle,
      text: '', // 신규 마스크 텍스트 필드
      isRevealed: false
    };

    if (!this.pageMasks[this.currentPage]) {
      this.pageMasks[this.currentPage] = [];
    }
    this.pageMasks[this.currentPage].push(newMask);

    this.playTone(520, 0.08);
    this.renderMasks();
    this.updateUI();
  }

  /* -------------------------------------------------------------
   * 7. 마스크 DOM 렌더링 & 인라인 텍스트 편집
   * ----------------------------------------------------------- */
  renderMasks() {
    this.maskOverlay.innerHTML = '';
    const masks = this.getCurrentMasks();

    masks.forEach((mask) => {
      const el = document.createElement('div');
      el.className = `mask-box style-${mask.style}`;
      if (mask.isRevealed) {
        el.classList.add('is-revealed');
      }

      el.style.left = `${(mask.x * 100).toFixed(3)}%`;
      el.style.top = `${(mask.y * 100).toFixed(3)}%`;
      el.style.width = `${(mask.w * 100).toFixed(3)}%`;
      el.style.height = `${(mask.h * 100).toFixed(3)}%`;
      el.setAttribute('data-id', mask.id);
      el.title = mask.text ? `${mask.text} (더블클릭하여 수정)` : '더블클릭하여 텍스트/힌트 입력';

      // 마스크 내용 컨테이너 (번호 배지 + 텍스트)
      const content = document.createElement('div');
      content.className = 'mask-content';

      const badge = document.createElement('div');
      badge.className = 'mask-badge';
      badge.textContent = mask.order;
      content.appendChild(badge);

      if (mask.text) {
        const textSpan = document.createElement('span');
        textSpan.className = 'mask-text';
        textSpan.textContent = mask.text;
        content.appendChild(textSpan);
      }

      el.appendChild(content);

      // 삭제 버튼
      const delBtn = document.createElement('button');
      delBtn.className = 'mask-delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.title = '이 가림판 삭제';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMask(mask.id);
      });
      el.appendChild(delBtn);

      // 마스크 드래그앤드롭 위치 이동 인터랙션
      let isDraggingThis = false;
      let startPointerX = 0, startPointerY = 0;
      let maskStartPixelX = 0, maskStartPixelY = 0;
      let hasMoved = false;

      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('.mask-delete-btn') || e.target.closest('.mask-inline-edit')) return;

        if (this.mode === 'draw') {
          isDraggingThis = true;
          hasMoved = false;

          const rect = this.maskOverlay.getBoundingClientRect();
          const currentScale = this.zoom;
          startPointerX = (e.clientX - rect.left) / currentScale;
          startPointerY = (e.clientY - rect.top) / currentScale;

          const overlayW = this.maskOverlay.clientWidth;
          const overlayH = this.maskOverlay.clientHeight;
          maskStartPixelX = mask.x * overlayW;
          maskStartPixelY = mask.y * overlayH;

          el.setPointerCapture(e.pointerId);
          e.stopPropagation();
        }
      });

      el.addEventListener('pointermove', (e) => {
        if (!isDraggingThis) return;

        const rect = this.maskOverlay.getBoundingClientRect();
        const currentScale = this.zoom;
        const currentPointerX = (e.clientX - rect.left) / currentScale;
        const currentPointerY = (e.clientY - rect.top) / currentScale;

        const deltaX = currentPointerX - startPointerX;
        const deltaY = currentPointerY - startPointerY;

        if (Math.hypot(deltaX, deltaY) > 4) {
          hasMoved = true;
          el.classList.add('is-dragging');
        }

        if (hasMoved) {
          const overlayW = this.maskOverlay.clientWidth;
          const overlayH = this.maskOverlay.clientHeight;

          let newPixelX = maskStartPixelX + deltaX;
          let newPixelY = maskStartPixelY + deltaY;

          const maskW = mask.w * overlayW;
          const maskH = mask.h * overlayH;

          newPixelX = Math.max(0, Math.min(overlayW - maskW, newPixelX));
          newPixelY = Math.max(0, Math.min(overlayH - maskH, newPixelY));

          el.style.left = `${((newPixelX / overlayW) * 100).toFixed(3)}%`;
          el.style.top = `${((newPixelY / overlayH) * 100).toFixed(3)}%`;
        }
      });

      const onPointerEnd = (e) => {
        if (!isDraggingThis) return;
        isDraggingThis = false;
        el.classList.remove('is-dragging');
        try { el.releasePointerCapture(e.pointerId); } catch {}

        if (hasMoved) {
          // 드래그 이동 완료: 최종 좌표 저장
          const currentLeftPercent = parseFloat(el.style.left) / 100;
          const currentTopPercent = parseFloat(el.style.top) / 100;

          mask.x = Math.max(0, Math.min(1 - mask.w, currentLeftPercent));
          mask.y = Math.max(0, Math.min(1 - mask.h, currentTopPercent));

          if (this.isWordCardOpen) this.renderWordCard();
          this.showToast(`가림판 #${mask.order} 위치가 변경되었습니다.`);
        } else {
          // 단순 클릭 시 공개 토글
          this.toggleMask(mask.id);
        }

        hasMoved = false;
        e.stopPropagation();
      };

      el.addEventListener('pointerup', onPointerEnd);
      el.addEventListener('pointercancel', onPointerEnd);

      // 수업 진행 모드에서의 클릭 공개 토글
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.mode !== 'draw') {
          this.toggleMask(mask.id);
        }
      });

      // 마스크 더블 클릭: 인라인 텍스트 입력창 활성화
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startInlineTextEdit(mask, el);
      });

      this.maskOverlay.appendChild(el);
    });

    this.renderSidebarList();
  }

  startInlineTextEdit(mask, maskEl) {
    // 기존 입력창이 있으면 중복 방지
    if (maskEl.querySelector('.mask-inline-edit')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'mask-inline-edit';
    input.value = mask.text || '';
    input.placeholder = '힌트/단어 입력 후 Enter';

    const saveText = () => {
      mask.text = input.value.trim();
      this.renderMasks();
      if (this.isWordCardOpen) this.renderWordCard();
    };

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        saveText();
      } else if (e.key === 'Escape') {
        this.renderMasks();
      }
    });

    input.addEventListener('blur', saveText);

    maskEl.appendChild(input);
    input.focus();
    input.select();
  }

  renderSidebarList() {
    const masks = this.getCurrentMasks();
    this.maskCountBadge.textContent = `${masks.length}개`;

    if (masks.length === 0) {
      this.maskListContainer.innerHTML = `
        <div class="mask-list-empty">
          화면 위를 마우스로 드래그하여<br>가리고 싶은 부분을 지정하세요.
        </div>`;
      return;
    }

    this.maskListContainer.innerHTML = '';
    masks.forEach((mask) => {
      const row = document.createElement('div');
      row.className = `mask-item-row ${mask.isRevealed ? 'is-revealed' : ''}`;
      row.setAttribute('draggable', 'true');
      row.setAttribute('data-id', mask.id);

      row.innerHTML = `
        <div class="mask-row-drag-handle" title="마우스로 끌어서 순서 변경">
          <svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: block; opacity: 0.7;">
            <circle cx="9" cy="5" r="2.5"></circle>
            <circle cx="15" cy="5" r="2.5"></circle>
            <circle cx="9" cy="12" r="2.5"></circle>
            <circle cx="15" cy="12" r="2.5"></circle>
            <circle cx="9" cy="19" r="2.5"></circle>
            <circle cx="15" cy="19" r="2.5"></circle>
          </svg>
        </div>
        <div class="mask-info" style="flex: 1; overflow: hidden; display: flex; align-items: center; gap: 0.4rem;">
          <div class="mask-num-badge">${mask.order}</div>
          <input type="text" class="mask-text-input" placeholder="힌트/단어 입력" value="${mask.text ? mask.text.replace(/"/g, '&quot;') : ''}">
        </div>
        <div class="mask-actions">
          <button class="btn btn-sm btn-icon-only card-row-btn" title="단어 카드로 보기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
              <rect x="2" y="3" width="20" height="14" rx="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </button>
          <button class="btn btn-sm btn-icon-only toggle-row-btn" title="${mask.isRevealed ? '다시 가리기' : '공개하기'}">
            ${mask.isRevealed ? '🔒' : '👁️'}
          </button>
          <button class="btn btn-sm btn-danger btn-icon-only del-row-btn" title="삭제">
            &times;
          </button>
        </div>
      `;

      // 텍스트 인풋 수정 시 실시간 동기화
      const textInput = row.querySelector('.mask-text-input');
      textInput.addEventListener('change', () => {
        mask.text = textInput.value.trim();
        this.renderMasks();
        if (this.isWordCardOpen) this.renderWordCard();
      });
      textInput.addEventListener('keydown', (e) => e.stopPropagation());

      // 드래그 앤 드롭 순서 변경 이벤트
      row.addEventListener('dragstart', (e) => {
        // 인풋이나 버튼 조작 중에는 드래그 방지
        if (e.target.tagName === 'INPUT' || e.target.closest('button, input')) {
          e.preventDefault();
          return;
        }
        this.draggedMaskRowId = mask.id;
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', mask.id);
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          row.classList.add('drag-over-top');
          row.classList.remove('drag-over-bottom');
        } else {
          row.classList.add('drag-over-bottom');
          row.classList.remove('drag-over-top');
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over-top', 'drag-over-bottom');
        const fromId = this.draggedMaskRowId || e.dataTransfer.getData('text/plain');
        const toId = mask.id;
        if (!fromId || fromId === toId) return;

        const rect = row.getBoundingClientRect();
        const insertBefore = e.clientY < (rect.top + rect.height / 2);
        this.reorderMasks(fromId, toId, insertBefore);
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('is-dragging');
        this.draggedMaskRowId = null;
        this.dragDropOverlay.classList.remove('active');
        this.maskListContainer.querySelectorAll('.mask-item-row').forEach(r => {
          r.classList.remove('drag-over-top', 'drag-over-bottom', 'is-dragging');
        });
      });

      // 단어 카드 버튼
      row.querySelector('.card-row-btn').addEventListener('click', () => {
        const index = masks.findIndex(m => m.id === mask.id);
        this.openWordCard(index);
      });

      // 공개 토글 버튼
      row.querySelector('.toggle-row-btn').addEventListener('click', () => {
        this.toggleMask(mask.id);
      });

      // 삭제 버튼
      row.querySelector('.del-row-btn').addEventListener('click', () => {
        this.deleteMask(mask.id);
      });

      this.maskListContainer.appendChild(row);
    });
  }

  reorderMasks(fromId, toId, insertBefore = true) {
    const masks = this.getCurrentMasks();
    const fromIndex = masks.findIndex(m => m.id === fromId);
    if (fromIndex === -1) return;

    const [movedItem] = masks.splice(fromIndex, 1);
    let toIndex = masks.findIndex(m => m.id === toId);
    if (toIndex === -1) {
      masks.push(movedItem);
    } else {
      if (!insertBefore) {
        toIndex += 1;
      }
      masks.splice(toIndex, 0, movedItem);
    }

    // 새로운 순서에 따라 order(1, 2, 3...) 속성 재부여
    masks.forEach((m, idx) => {
      m.order = idx + 1;
    });

    this.renderMasks();
    this.renderSidebarList();
    this.updateUI();
    if (this.isWordCardOpen) this.renderWordCard();
    this.showToast(`가림판 순서가 재배치되었습니다. (① ~ ⑤)`);
  }

  /* -------------------------------------------------------------
   * 8. 단어 카드 포커스 모드 (Word Card Focus Modal)
   * ----------------------------------------------------------- */
  openWordCard(index = null) {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) {
      this.showToast('등록된 가림판이 없습니다. 먼저 화면에 가림판을 만들어주세요.');
      return;
    }

    if (index !== null && index >= 0 && index < masks.length) {
      this.currentCardIndex = index;
    } else {
      // 첫 미공개 카드 또는 현재 인덱스
      const firstUnrevealed = masks.findIndex(m => !m.isRevealed);
      this.currentCardIndex = firstUnrevealed !== -1 ? firstUnrevealed : 0;
    }

    this.isWordCardOpen = true;
    this.wordCardBackdrop.classList.add('open');
    this.renderWordCard();
  }

  closeWordCard() {
    this.isWordCardOpen = false;
    this.wordCardBackdrop.classList.remove('open');
  }

  renderWordCard() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) {
      this.closeWordCard();
      return;
    }

    // 인덱스 바운더리 보호
    if (this.currentCardIndex >= masks.length) this.currentCardIndex = masks.length - 1;
    if (this.currentCardIndex < 0) this.currentCardIndex = 0;

    const mask = masks[this.currentCardIndex];
    this.wordCardProgress.textContent = `${this.currentCardIndex + 1} / ${masks.length}`;
    this.wordCardNum.textContent = mask.order;

    // 텍스트 내용 반영
    if (mask.text && mask.text.trim().length > 0) {
      this.wordCardText.textContent = mask.text;
      this.wordCardText.classList.remove('empty');
    } else {
      this.wordCardText.textContent = '(입력된 힌트/단어가 없습니다)';
      this.wordCardText.classList.add('empty');
    }

    // 캔버스 원본 크롭 렌더링
    this.renderWordCardCrop(mask);

    // 가림 / 공개 상태 텍스트 힌트 갱신
    if (mask.isRevealed) {
      this.wordCardCropCanvas.classList.remove('is-masked');
      this.wordCardStateHint.innerHTML = '<span style="color: #10b981;">👁️ 정답/내용 공개됨 (클릭 시 다시 가림)</span>';
      this.toggleWordCardBtn.textContent = '다시 가리기';
    } else {
      this.wordCardCropCanvas.classList.add('is-masked');
      this.wordCardStateHint.innerHTML = '<span style="color: #38bdf8;">🔒 가림 상태 (클릭 또는 Enter로 공개)</span>';
      this.toggleWordCardBtn.textContent = '내용 공개';
    }

    // 이전/다음 버튼 활성/비활성 제어
    this.prevWordCardBtn.disabled = this.currentCardIndex === 0;
    this.nextWordCardBtn.disabled = this.currentCardIndex === masks.length - 1;
  }

  renderWordCardCrop(mask) {
    if (!this.renderCanvas.width || !this.renderCanvas.height) return;

    const cropX = Math.round(mask.x * this.renderCanvas.width);
    const cropY = Math.round(mask.y * this.renderCanvas.height);
    const cropW = Math.max(1, Math.round(mask.w * this.renderCanvas.width));
    const cropH = Math.max(1, Math.round(mask.h * this.renderCanvas.height));

    this.wordCardCropCanvas.width = cropW;
    this.wordCardCropCanvas.height = cropH;

    this.wordCardCropCtx.clearRect(0, 0, cropW, cropH);
    this.wordCardCropCtx.drawImage(
      this.renderCanvas,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );
  }

  nextWordCard() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;

    // 현재 카드 공개 후 다음 카드로 스무스하게 진행
    const currentMask = masks[this.currentCardIndex];
    if (!currentMask.isRevealed) {
      currentMask.isRevealed = true;
      if (!this.revealHistory.includes(currentMask.id)) {
        this.revealHistory.push(currentMask.id);
      }
    }

    if (this.currentCardIndex < masks.length - 1) {
      this.currentCardIndex++;
      this.playTone(660, 0.1);
    } else {
      this.showToast('마지막 단어 카드입니다.');
    }

    this.renderWordCard();
    this.renderMasks();
    this.updateUI();
  }

  prevWordCard() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;

    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.playTone(440, 0.08);
      this.renderWordCard();
      this.renderMasks();
      this.updateUI();
    } else {
      this.showToast('첫 번째 단어 카드입니다.');
    }
  }

  toggleWordCardContent() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;

    const mask = masks[this.currentCardIndex];
    this.toggleMask(mask.id);
    this.renderWordCard();
  }

  /* -------------------------------------------------------------
   * 9. 순차 공개 (지우기) 엔진
   * ----------------------------------------------------------- */
  getCurrentMasks() {
    return this.pageMasks[this.currentPage] || [];
  }

  revealNext() {
    const masks = this.getCurrentMasks();
    const hiddenMasks = masks
      .filter(m => !m.isRevealed)
      .sort((a, b) => a.order - b.order);

    if (hiddenMasks.length === 0) {
      this.showToast('모든 가림판이 이미 공개되었습니다.');
      return;
    }

    const target = hiddenMasks[0];
    target.isRevealed = true;
    this.revealHistory.push(target.id);

    this.playTone(660, 0.12);
    this.renderMasks();
    this.updateUI();
  }

  restorePrev() {
    if (this.revealHistory.length === 0) {
      this.showToast('복구할 이전 가림판이 없습니다.');
      return;
    }

    const lastMaskId = this.revealHistory.pop();
    const masks = this.getCurrentMasks();
    const target = masks.find(m => m.id === lastMaskId);

    if (target) {
      target.isRevealed = false;
      this.playTone(440, 0.08);
      this.renderMasks();
      this.updateUI();
    }
  }

  revealAll() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;

    masks.forEach(m => {
      m.isRevealed = true;
      if (!this.revealHistory.includes(m.id)) {
        this.revealHistory.push(m.id);
      }
    });

    this.playTone(880, 0.15);
    this.renderMasks();
    this.updateUI();
    this.showToast('모든 가림판을 공개했습니다.');
  }

  hideAll() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;

    masks.forEach(m => m.isRevealed = false);
    this.revealHistory = [];

    this.playTone(330, 0.1);
    this.renderMasks();
    this.updateUI();
    this.showToast('모든 가림판을 다시 가렸습니다.');
  }

  toggleMask(maskId) {
    const masks = this.getCurrentMasks();
    const target = masks.find(m => m.id === maskId);
    if (!target) return;

    target.isRevealed = !target.isRevealed;
    if (target.isRevealed) {
      this.revealHistory.push(target.id);
      this.playTone(660, 0.1);
    } else {
      this.revealHistory = this.revealHistory.filter(id => id !== target.id);
      this.playTone(440, 0.08);
    }

    this.renderMasks();
    this.updateUI();
  }

  deleteMask(maskId) {
    const masks = this.getCurrentMasks();
    const index = masks.findIndex(m => m.id === maskId);
    if (index !== -1) {
      masks.splice(index, 1);
      masks.forEach((m, idx) => m.order = idx + 1);
      this.revealHistory = this.revealHistory.filter(id => id !== maskId);
      this.renderMasks();
      this.updateUI();
      if (this.isWordCardOpen) this.renderWordCard();
    }
  }

  clearAllMasks() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;
    if (confirm('현재 페이지의 모든 가림판을 삭제하시겠습니까?')) {
      this.pageMasks[this.currentPage] = [];
      this.revealHistory = [];
      this.renderMasks();
      this.updateUI();
      if (this.isWordCardOpen) this.closeWordCard();
      this.showToast('가림판이 모두 삭제되었습니다.');
    }
  }

  /* -------------------------------------------------------------
   * 10. UI 상태 및 진행 바 업데이트
   * ----------------------------------------------------------- */
  updateUI() {
    const masks = this.getCurrentMasks();
    const total = masks.length;
    const revealedCount = masks.filter(m => m.isRevealed).length;

    this.progressRatioText.textContent = `${revealedCount} / ${total}`;
    const percent = total > 0 ? (revealedCount / total) * 100 : 0;
    this.progressFill.style.width = `${percent}%`;

    this.nextRevealBtn.disabled = total === 0 || revealedCount === total;
    this.prevRevealBtn.disabled = this.revealHistory.length === 0;
  }

  /* -------------------------------------------------------------
   * 11. 단축키 처리
   * ----------------------------------------------------------- */
  handleKeyDown(e) {
    // 텍스트 인풋 포커스 중일 때는 단축키 무시
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    // 1. 단어 카드 포커스 모달이 열려있는 경우의 전용 단축키
    if (this.isWordCardOpen) {
      switch (e.code) {
        case 'Space':
        case 'ArrowRight':
          e.preventDefault();
          this.nextWordCard(); // 단어 카드 포커스 상태에서 다음 마스킹 내용 보여주기
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.prevWordCard();
          break;
        case 'Enter':
          e.preventDefault();
          this.toggleWordCardContent();
          break;
        case 'KeyC':
        case 'Escape':
          e.preventDefault();
          this.closeWordCard();
          break;
      }
      return;
    }

    // 2. 기본 화면 단축키
    switch (e.code) {
      case 'Space':
      case 'ArrowRight':
        e.preventDefault();
        this.revealNext();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.restorePrev();
        break;
      case 'KeyC':
        e.preventDefault();
        this.openWordCard();
        break;
      case 'KeyR':
        e.preventDefault();
        this.hideAll();
        break;
      case 'KeyA':
        e.preventDefault();
        this.revealAll();
        break;
      case 'KeyF':
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case 'PageUp':
        e.preventDefault();
        this.changePage(this.currentPage - 1);
        break;
      case 'PageDown':
        e.preventDefault();
        this.changePage(this.currentPage + 1);
        break;
      case 'Escape':
        this.helpModal.classList.remove('open');
        break;
    }
  }

  /* -------------------------------------------------------------
   * 12. 마스킹 템플릿 보관함 (LocalStorage & JSON)
   * ----------------------------------------------------------- */
  initLocalPresets() {
    try {
      const presets = JSON.parse(localStorage.getItem('masking_remover_presets') || localStorage.getItem('edumask_presets') || '{}');
      this.presetSelect.innerHTML = '<option value="">-- 보관된 템플릿 선택 --</option>';
      Object.keys(presets).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `${name} (${presets[name].masks?.length || 0}개 마스크)`;
        this.presetSelect.appendChild(opt);
      });
    } catch {
      // 로컬스토리지 오류 무시
    }
  }

  saveLocalPreset() {
    const name = this.presetNameInput.value.trim();
    if (!name) {
      this.showToast('템플릿 이름을 입력해주세요 (예: 1반 퀴즈)', 'error');
      this.presetNameInput.focus();
      return;
    }

    const currentMasks = this.getCurrentMasks();
    if (currentMasks.length === 0) {
      this.showToast('저장할 가림판이 없습니다. 먼저 가림판을 생성해주세요.', 'error');
      return;
    }

    try {
      const presets = JSON.parse(localStorage.getItem('masking_remover_presets') || localStorage.getItem('edumask_presets') || '{}');
      presets[name] = {
        savedAt: new Date().toISOString(),
        masks: JSON.parse(JSON.stringify(currentMasks)).map(m => {
          m.isRevealed = false;
          return m;
        })
      };
      localStorage.setItem('masking_remover_presets', JSON.stringify(presets));
      this.initLocalPresets();
      this.presetSelect.value = name;
      this.presetNameInput.value = '';
      this.showToast(`'${name}' 템플릿이 브라우저 보관함에 저장되었습니다.`);
    } catch (err) {
      console.error(err);
      this.showToast('템플릿 저장 중 오류가 발생했습니다.', 'error');
    }
  }

  loadLocalPreset() {
    const name = this.presetSelect.value;
    if (!name) {
      this.showToast('불러올 템플릿을 목록에서 선택해주세요.', 'error');
      return;
    }

    try {
      const presets = JSON.parse(localStorage.getItem('masking_remover_presets') || localStorage.getItem('edumask_presets') || '{}');
      const preset = presets[name];
      if (preset && preset.masks) {
        this.pageMasks[this.currentPage] = JSON.parse(JSON.stringify(preset.masks));
        this.revealHistory = [];
        this.renderMasks();
        this.updateUI();
        if (this.isWordCardOpen) this.renderWordCard();
        this.showToast(`'${name}' 템플릿 마스킹이 현재 화면에 적용되었습니다.`);
      }
    } catch (err) {
      console.error(err);
      this.showToast('템플릿 적용에 실패했습니다.', 'error');
    }
  }

  deleteLocalPreset() {
    const name = this.presetSelect.value;
    if (!name) {
      this.showToast('삭제할 템플릿을 선택해주세요.', 'error');
      return;
    }

    if (confirm(`'${name}' 템플릿을 보관함에서 삭제하시겠습니까?`)) {
      try {
        const presets = JSON.parse(localStorage.getItem('masking_remover_presets') || localStorage.getItem('edumask_presets') || '{}');
        delete presets[name];
        localStorage.setItem('masking_remover_presets', JSON.stringify(presets));
        this.initLocalPresets();
        this.showToast(`'${name}' 템플릿이 삭제되었습니다.`);
      } catch (err) {
        console.error(err);
      }
    }
  }

  exportToJson() {
    const exportData = {
      app: 'Masking Remover',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      totalPages: this.totalPages,
      pageMasks: this.pageMasks
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `masking_remover_preset_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('가림판 텍스트 및 설정 파일(.json)이 저장되었습니다.');
  }

  importFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.pageMasks) {
          this.pageMasks = data.pageMasks;
          this.revealHistory = [];
          this.renderMasks();
          this.updateUI();
          this.showToast('가림판 설정을 성공적으로 불러왔습니다.');
        } else {
          this.showToast('올바른 Masking Remover 설정 파일이 아닙니다.', 'error');
        }
      } catch (err) {
        console.error(err);
        this.showToast('JSON 파일을 해석하지 못했습니다.', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  /* -------------------------------------------------------------
   * 13. 유틸리티 (오디오 톤 & 토스트)
   * ----------------------------------------------------------- */
  playTone(freq, duration) {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // 오디오 미지원 브라우저 무시
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.borderLeftColor = 'var(--danger)';
    }

    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 2500);
  }
}

// 브라우저 로드 시 앱 인스턴스 초기화
window.addEventListener('DOMContentLoaded', () => {
  window.maskingRemoverApp = new MaskingRemoverApp();
  window.eduMaskApp = window.maskingRemoverApp; // 하위 호환성 유지
});
