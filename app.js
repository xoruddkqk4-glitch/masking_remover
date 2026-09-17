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
    this.actionHistory = []; // 되돌리기 (Undo) 전용 액션 스택

    // 단어 카드 포커스 모드 상태
    this.isWordCardOpen = false;
    this.currentCardIndex = 0;

    // 드로잉 인터랙션 상태
    this.isDrawing = false;
    this.drawStart = { x: 0, y: 0 };
    this.activeDrawingRect = null;
    this.draggedMaskRowId = null;

    // 현재 작업 중인 문서 및 JSON 파일 상태 (최근 폴더 및 덮어쓰기 연동)
    this.currentDocumentFileName = null;
    this.currentJsonFileHandle = null;
    this.currentJsonFileName = null;

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
    this.saveAsJsonBtn = document.getElementById('saveAsJsonBtn');
    this.importJsonBtn = document.getElementById('importJsonBtn');
    this.jsonFileInput = document.getElementById('jsonFileInput');
    this.currentJsonInfo = document.getElementById('currentJsonInfo');
    this.currentJsonName = document.getElementById('currentJsonName');
    this.shortcutsSectionCard = document.getElementById('shortcutsSectionCard');
    this.toggleShortcutsBtn = document.getElementById('toggleShortcutsBtn');

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

    // 학생용 유인물 인쇄 & PDF 저장 모달 요소
    this.printHandoutBtn = document.getElementById('printHandoutBtn');
    this.printModal = document.getElementById('printModal');
    this.closePrintBtn = document.getElementById('closePrintBtn');
    this.downloadPdfDirectBtn = document.getElementById('downloadPdfDirectBtn');
    this.printBrowserDialogBtn = document.getElementById('printBrowserDialogBtn');
    this.maskAllForPrintCheckbox = document.getElementById('maskAllForPrintCheckbox');
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

    // 파일 업로드 (최근 작업 폴더 연동 showOpenFilePicker 우선 호출)
    this.uploadBtn.addEventListener('click', () => this.handleOpenWorksheet());
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
    this.prevRevealBtn.addEventListener('click', () => this.undo());
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
    this.saveAsJsonBtn.addEventListener('click', () => this.saveAsJson());
    this.importJsonBtn.addEventListener('click', () => this.handleImportJson());
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

    // 사이드바 단축키 아코디언 토글 (클릭 시 아래로 펼쳐짐/접힘)
    if (this.toggleShortcutsBtn && this.shortcutsSectionCard) {
      this.toggleShortcutsBtn.addEventListener('click', () => {
        const isOpen = this.shortcutsSectionCard.classList.toggle('open');
        this.toggleShortcutsBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // 학생용 유인물 인쇄 & PDF 모달 이벤트
    if (this.printHandoutBtn) {
      this.printHandoutBtn.addEventListener('click', () => this.openPrintHandoutModal());
    }
    if (this.closePrintBtn) {
      this.closePrintBtn.addEventListener('click', () => this.closePrintHandoutModal());
    }
    if (this.downloadPdfDirectBtn) {
      this.downloadPdfDirectBtn.addEventListener('click', () => this.exportStudentPdf());
    }
    if (this.printBrowserDialogBtn) {
      this.printBrowserDialogBtn.addEventListener('click', () => this.printHandout());
    }
    if (this.printModal) {
      this.printModal.addEventListener('click', (e) => {
        if (e.target === this.printModal) this.closePrintHandoutModal();
      });
    }

    // 키보드 단축키
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 사이드바 하단 단축키 안내 아코디언 토글
    if (this.toggleShortcutsBtn && this.shortcutsSectionCard) {
      this.toggleShortcutsBtn.addEventListener('click', () => {
        const isOpen = this.shortcutsSectionCard.classList.toggle('open');
        this.toggleShortcutsBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

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

    const baseHeight = this.renderCanvas.height || 720;
    const baseWidth = this.renderCanvas.width || 1000;
    const scaledHeight = baseHeight * this.zoom;
    const scaledWidth = baseWidth * this.zoom;

    // CSS transform: scale은 레이아웃 박스 크기를 변경하지 않으므로:
    // 축소 시(zoom <= 1.0)에는 높이 차이만큼 음수 마진을 주어 DOM 박스를 시각적 높이에 완벽 일치시키고,
    // 확대 시(zoom > 1.0)에는 초과 높이만큼 양수 마진을 주어 문서 하단 끝까지 스크롤을 보장합니다.
    const heightDiff = scaledHeight - baseHeight;
    const widthDiff = scaledWidth - baseWidth;

    if (this.zoom > 1.0) {
      this.canvasWrapper.style.marginBottom = `${heightDiff + 30}px`;
    } else {
      this.canvasWrapper.style.marginBottom = `${heightDiff}px`;
    }

    if (widthDiff > 0) {
      this.canvasWrapper.style.marginLeft = `${widthDiff / 2}px`;
      this.canvasWrapper.style.marginRight = `${widthDiff / 2}px`;
    } else {
      this.canvasWrapper.style.marginLeft = '0px';
      this.canvasWrapper.style.marginRight = '0px';
    }
  }

  fitToPage() {
    if (!this.renderCanvas.width || !this.renderCanvas.height) return;
    
    // 뷰포트 패딩과 테두리 그림자(box-shadow)를 감안한 여유 가용 공간 계산
    const availWidth = Math.max(100, this.viewportContainer.clientWidth - 32);
    const availHeight = Math.max(100, this.viewportContainer.clientHeight - 32);

    const scaleX = availWidth / this.renderCanvas.width;
    const scaleY = availHeight / this.renderCanvas.height;

    // 0.96 안전 계수를 적용하여 하단 카드 테두리까지 화면 상하좌우 어디도 잘림 없이 100% 쏙 들어오게 맞춤
    const fitZoom = Math.min(scaleX, scaleY) * 0.96;
    this.setZoom(fitZoom);
  }

  fitToWidth() {
    if (!this.renderCanvas.width) return;
    const availableWidth = Math.max(100, this.viewportContainer.clientWidth - 32);
    const canvasWidth = this.renderCanvas.width;
    if (availableWidth <= 0 || canvasWidth <= 0) return;
    const calculatedZoom = (availableWidth / canvasWidth) * 0.98;
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
    this.currentDocumentFileName = file.name;
    this.currentJsonFileHandle = null;
    this.currentJsonFileName = null;
    this.updateJsonFileIndicator();

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
    this.currentDocumentFileName = 'sample_worksheet';
    this.currentJsonFileHandle = null;
    this.currentJsonFileName = null;
    this.updateJsonFileIndicator();

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
    c.fillRect(50, 475, w - 100, 190);
    c.strokeStyle = '#93c5fd';
    c.lineWidth = 1.5;
    c.strokeRect(50, 475, w - 100, 190);

    c.fillStyle = '#2563eb';
    c.font = 'bold 17px "Pretendard", sans-serif';
    c.fillText('💡 Masking Remover 핵심 활용 팁', 70, 505);

    c.fillStyle = '#475569';
    c.font = '14px "Pretendard", sans-serif';
    c.fillText('1. 이미 생성된 마스킹 네모 박스는 마우스로 드래그하여 화면 원하는 곳으로 자유롭게 이동할 수 있습니다.', 70, 533);
    c.fillText('2. 가림판을 더블클릭하여 텍스트를 입력하거나, 상단 [단어 카드(C)]로 2배 대형 플래시 카드 모드를 실행해보세요.', 70, 561);
    c.fillText('3. Space / 방향키(→)로 다음 가림판을 순서대로 지우고, 전체화면(F) 시 사이드바가 숨겨지며 가로 맞춤됩니다.', 70, 589);
    c.fillText('4. 교재 파일과 무관하게 왼쪽 패널의 [템플릿 보관함]을 이용해 가림판 구성을 저장하고 언제든 재사용할 수 있습니다.', 70, 617);

    // 기본 샘플 가림판 4개 등록 (기본값: 순서 번호만 표시)
    this.pageMasks[1] = [
      {
        id: 'sample_mask_1',
        order: 1,
        x: 120 / w,
        y: 140 / h,
        w: 320 / w,
        h: 32 / h,
        style: 'slate',
        text: '', // 기본값: 순서 번호만 표시
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
        text: '', // 기본값: 순서 번호만 표시
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
        text: '', // 기본값: 순서 번호만 표시
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
        text: '', // 기본값: 순서 번호만 표시
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
    this.actionHistory.push({ type: 'create_mask', id: newMask.id, page: this.currentPage });

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
      el.title = mask.text ? `#${mask.order} - ${mask.text} (더블클릭하여 수정)` : `가림판 #${mask.order} (더블클릭하여 텍스트/힌트 입력)`;

      // 순번 배지 (마스킹 상단 외부에 뱃지 형태로 표시하여 내부 필기 공간 100% 확보)
      const badge = document.createElement('div');
      badge.className = 'mask-badge';
      badge.textContent = mask.order;
      el.appendChild(badge);

      // 마스크 내용 컨테이너 (힌트/메모 텍스트가 있을 때 표시)
      const content = document.createElement('div');
      content.className = 'mask-content';

      if (mask.text && mask.text.trim()) {
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
          <input type="text" class="mask-text-input" placeholder="순번 #${mask.order} (텍스트 없음)" value="${mask.text ? mask.text.replace(/"/g, '&quot;') : ''}">
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

    // 텍스트 내용 반영 (하단 힌트 영역)
    if (mask.text && mask.text.trim().length > 0) {
      this.wordCardText.textContent = mask.text;
      this.wordCardText.classList.remove('empty');
    } else {
      this.wordCardText.textContent = '(등록된 힌트/메모가 없습니다)';
      this.wordCardText.classList.add('empty');
    }

    // 캔버스 원본 크롭 렌더링 (대형 고화질 렌더링)
    this.renderWordCardCrop(mask);

    // 가림 / 공개 상태 텍스트 힌트 갱신
    if (mask.isRevealed) {
      this.wordCardCropCanvas.classList.remove('is-masked');
      this.wordCardStateHint.innerHTML = '<span style="color: #10b981;">👁️ 정답 공개됨 (클릭/Enter 시 다시 가림)</span>';
      this.toggleWordCardBtn.textContent = '다시 가리기';
    } else {
      this.wordCardCropCanvas.classList.add('is-masked');
      this.wordCardStateHint.innerHTML = '<span style="color: #38bdf8;">🔒 가림 상태 (클릭 또는 Enter로 공개)</span>';
      this.toggleWordCardBtn.textContent = '정답 공개';
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

    // 정답 캔버스를 화면에 시원하고 크게 확대 표시하기 위한 최적 스케일 계산
    const maxDisplayW = Math.min(960, window.innerWidth * 0.78);
    const maxDisplayH = 260;

    // 기본적으로 높이 기준 2.8x~3.5x 확대를 목표로 설정하여 정답이 크고 뚜렷하게 보이도록 함
    let scale = Math.max(2.4, Math.min(4.5, 140 / cropH));
    if (cropW * scale > maxDisplayW) {
      scale = maxDisplayW / cropW;
    }
    if (cropH * scale > maxDisplayH) {
      scale = maxDisplayH / cropH;
    }
    scale = Math.max(scale, 1.8); // 최소 1.8배 이상 확대

    const displayW = Math.round(cropW * scale);
    const displayH = Math.round(cropH * scale);

    // 고해상도(Retina 2x) 선명도 적용
    const dpr = Math.max(2, window.devicePixelRatio || 2);
    this.wordCardCropCanvas.width = Math.round(displayW * dpr);
    this.wordCardCropCanvas.height = Math.round(displayH * dpr);
    this.wordCardCropCanvas.style.width = `${displayW}px`;
    this.wordCardCropCanvas.style.height = `${displayH}px`;

    this.wordCardCropCtx.save();
    this.wordCardCropCtx.scale(dpr, dpr);
    this.wordCardCropCtx.imageSmoothingEnabled = true;
    this.wordCardCropCtx.imageSmoothingQuality = 'high';
    this.wordCardCropCtx.clearRect(0, 0, displayW, displayH);
    this.wordCardCropCtx.drawImage(
      this.renderCanvas,
      cropX, cropY, cropW, cropH,
      0, 0, displayW, displayH
    );
    this.wordCardCropCtx.restore();
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
    this.actionHistory.push({ type: 'reveal_mask', id: target.id, page: this.currentPage });

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

  /* -------------------------------------------------------------
   * 실행 취소 및 되돌리기 (Undo Engine: Ctrl + Z / ←)
   * ----------------------------------------------------------- */
  undo() {
    if (this.actionHistory && this.actionHistory.length > 0) {
      const action = this.actionHistory.pop();
      if (action.page && action.page !== this.currentPage && this.docType === 'pdf') {
        this.changePage(action.page);
      }

      const masks = this.getCurrentMasks();
      switch (action.type) {
        case 'reveal_mask': {
          const mask = masks.find(m => m.id === action.id);
          if (mask) {
            mask.isRevealed = false;
            this.revealHistory = this.revealHistory.filter(id => id !== mask.id);
            this.playTone(440, 0.08);
            this.renderMasks();
            this.updateUI();
            this.showToast(`가림판 #${mask.order} 복구 (되돌리기)`);
            return;
          }
          break;
        }
        case 'create_mask': {
          const idx = masks.findIndex(m => m.id === action.id);
          if (idx !== -1) {
            masks.splice(idx, 1);
            masks.forEach((m, i) => m.order = i + 1);
            this.revealHistory = this.revealHistory.filter(id => id !== action.id);
            this.playTone(380, 0.08);
            this.renderMasks();
            this.updateUI();
            if (this.isWordCardOpen) this.renderWordCard();
            this.showToast('새로 만든 가림판 삭제 (되돌리기)');
            return;
          }
          break;
        }
        case 'delete_mask': {
          const restored = action.mask;
          masks.splice(action.index, 0, restored);
          masks.forEach((m, i) => m.order = i + 1);
          this.playTone(520, 0.08);
          this.renderMasks();
          this.updateUI();
          if (this.isWordCardOpen) this.renderWordCard();
          this.showToast(`삭제했던 가림판 #${restored.order} 복원 (되돌리기)`);
          return;
        }
        case 'reveal_all': {
          action.ids.forEach(id => {
            const m = masks.find(x => x.id === id);
            if (m) m.isRevealed = false;
          });
          this.revealHistory = [];
          this.playTone(440, 0.08);
          this.renderMasks();
          this.updateUI();
          this.showToast('전체 공개 취소 (되돌리기)');
          return;
        }
        case 'hide_all': {
          action.ids.forEach(id => {
            const m = masks.find(x => x.id === id);
            if (m) m.isRevealed = true;
          });
          this.revealHistory = [...action.ids];
          this.playTone(660, 0.1);
          this.renderMasks();
          this.updateUI();
          this.showToast('다시 가리기 취소 (되돌리기)');
          return;
        }
      }
    }

    // actionHistory에 기록이 없더라도 revealHistory가 남아있다면 이전 가림판 복구 수행
    if (this.revealHistory.length > 0) {
      this.restorePrev();
      this.showToast('이전 가림판 복구 (되돌리기)');
    } else {
      this.showToast('되돌릴 이전 작업이 없습니다.');
    }
  }

  revealAll() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;

    const newlyRevealedIds = masks.filter(m => !m.isRevealed).map(m => m.id);
    masks.forEach(m => {
      m.isRevealed = true;
      if (!this.revealHistory.includes(m.id)) {
        this.revealHistory.push(m.id);
      }
    });

    if (newlyRevealedIds.length > 0) {
      this.actionHistory.push({ type: 'reveal_all', ids: newlyRevealedIds, page: this.currentPage });
    }

    this.playTone(880, 0.15);
    this.renderMasks();
    this.updateUI();
    this.showToast('모든 가림판을 공개했습니다.');
  }

  hideAll() {
    const masks = this.getCurrentMasks();
    if (masks.length === 0) return;

    const prevRevealed = masks.filter(m => m.isRevealed).map(m => m.id);
    masks.forEach(m => m.isRevealed = false);
    this.revealHistory = [];

    if (prevRevealed.length > 0) {
      this.actionHistory.push({ type: 'hide_all', ids: prevRevealed, page: this.currentPage });
    }

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
      this.actionHistory.push({ type: 'reveal_mask', id: target.id, page: this.currentPage });
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
      const deletedMask = JSON.parse(JSON.stringify(masks[index]));
      this.actionHistory.push({ type: 'delete_mask', mask: deletedMask, index, page: this.currentPage });

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
    this.prevRevealBtn.disabled = this.revealHistory.length === 0 && (!this.actionHistory || this.actionHistory.length === 0);
  }

  /* -------------------------------------------------------------
   * 11. 단축키 처리
   * ----------------------------------------------------------- */
  handleKeyDown(e) {
    // 텍스트 인풋 포커스 중일 때는 단축키 무시
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    // Ctrl + Z: 실행 취소 / 되돌리기
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (this.isWordCardOpen) {
        const masks = this.getCurrentMasks();
        const currentMask = masks[this.currentCardIndex];
        if (currentMask && currentMask.isRevealed) {
          this.toggleWordCardContent();
        } else if (this.currentCardIndex > 0) {
          this.prevWordCard();
        }
      } else {
        this.undo();
      }
      return;
    }

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
          const currentMask = this.getCurrentMasks()[this.currentCardIndex];
          if (currentMask && currentMask.isRevealed) {
            this.toggleWordCardContent();
          } else {
            this.prevWordCard();
          }
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

    // Ctrl + P: 학생용 유인물 인쇄 및 PDF 저장 모달 단축키
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      this.openPrintHandoutModal();
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
        this.undo();
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
        if (this.printModal) this.closePrintHandoutModal();
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

  async handleOpenWorksheet() {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          id: 'masking_remover_workspace_dir', // 최근 작업 폴더 ID 공유
          multiple: false,
          types: [{
            description: '학습지 문서 및 이미지 (*.pdf, *.png, *.jpg, *.jpeg, *.webp)',
            accept: {
              'application/pdf': ['.pdf'],
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']
            }
          }]
        });
        const file = await fileHandle.getFile();
        this.loadFile(file);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // 사용자가 선택 취소
        console.warn('showOpenFilePicker failed for worksheet, falling back to input:', err);
      }
    }
    this.fileInput.click();
  }

  updateJsonFileIndicator() {
    if (this.currentJsonInfo && this.currentJsonName) {
      if (this.currentJsonFileName) {
        this.currentJsonName.textContent = this.currentJsonFileName;
        this.currentJsonInfo.style.display = 'block';
        if (this.exportJsonBtn) {
          this.exportJsonBtn.title = `'${this.currentJsonFileName}' 파일에 바로 덮어쓰기 저장합니다`;
        }
      } else {
        this.currentJsonInfo.style.display = 'none';
        if (this.exportJsonBtn) {
          this.exportJsonBtn.title = '가림판 설정을 저장합니다 (새 파일 저장)';
        }
      }
    }
  }

  getExportJsonString() {
    const exportData = {
      app: 'Masking Remover',
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      totalPages: this.totalPages,
      pageMasks: this.pageMasks
    };
    return JSON.stringify(exportData, null, 2);
  }

  // 1. 파일로 저장 (json): 이미 불러온 파일이 있으면 기존 파일에 덮어쓰기, 없으면 최근 작업 폴더를 열어 저장
  async exportToJson() {
    // 1-1. 이미 열려 있거나 저장된 JSON 파일 핸들이 있는 경우: 기존 파일에 바로 덮어쓰기
    if (this.currentJsonFileHandle) {
      try {
        const jsonString = this.getExportJsonString();
        const writable = await this.currentJsonFileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        this.showToast(`'${this.currentJsonFileName || this.currentJsonFileHandle.name}' 파일에 덮어쓰기 저장되었습니다.`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Overwriting existing fileHandle failed, falling back to save picker:', err);
      }
    }

    // 1-2. 처음 저장하는 경우: 최근 작업 폴더가 열리며 새 파일로 저장
    await this.saveAsJson();
  }

  // 2. 다른 파일로 저장 (json): 이미 불러온 파일이 있더라도 최근 작업 폴더를 열고 새 이름으로 저장
  async saveAsJson() {
    const jsonString = this.getExportJsonString();

    // 기본 추천 파일명 구성
    let defaultFileName;
    if (this.currentJsonFileName) {
      const nameWithoutExt = this.currentJsonFileName.replace(/\.json$/i, '');
      defaultFileName = `${nameWithoutExt}_copy.json`;
    } else if (this.currentDocumentFileName) {
      const docBase = this.currentDocumentFileName.replace(/\.[^/.]+$/, '');
      defaultFileName = `${docBase}_masking.json`;
    } else {
      defaultFileName = `masking_remover_preset_${new Date().toISOString().slice(0, 10)}.json`;
    }

    // 최신 브라우저 File System Access API: 최근 작업 폴더(ID: masking_remover_workspace_dir) 자동 열림
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          id: 'masking_remover_workspace_dir',
          suggestedName: defaultFileName,
          types: [{
            description: '가림판 설정 파일 (*.json)',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        // 새로 저장한 파일 핸들로 활성 파일 갱신
        this.currentJsonFileHandle = fileHandle;
        this.currentJsonFileName = fileHandle.name;
        this.updateJsonFileIndicator();
        this.showToast(`'${fileHandle.name}' 파일로 저장되었습니다.`);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // 사용자가 저장 취소
        console.warn('showSaveFilePicker failed, falling back to download link:', err);
      }
    }

    // Fallback: 일반 웹 다운로드 링크 방식
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('가림판 텍스트 및 설정 파일(.json)이 저장되었습니다.');
  }

  // 3. 파일 불러오기: 최근 작업 폴더를 열고 가림판 JSON 파일 선택
  async handleImportJson() {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          id: 'masking_remover_workspace_dir', // 최근 작업 폴더 ID 공유
          multiple: false,
          types: [{
            description: '가림판 설정 파일 (*.json)',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();

        // 불러온 파일 핸들 등록 (추후 '파일로 저장' 시 덮어쓰기 연동)
        this.currentJsonFileHandle = fileHandle;
        this.currentJsonFileName = fileHandle.name;
        this.updateJsonFileIndicator();

        this.applyImportedJson(text);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // 사용자가 열기 취소
        console.warn('showOpenFilePicker failed, falling back to input file:', err);
      }
    }

    // Fallback: 기존 숨겨진 input[type=file] 방식
    this.jsonFileInput.click();
  }

  applyImportedJson(text) {
    try {
      const data = JSON.parse(text);
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
  }

  importFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.currentJsonFileHandle = null;
    this.currentJsonFileName = file.name;
    this.updateJsonFileIndicator();

    const reader = new FileReader();
    reader.onload = (event) => {
      this.applyImportedJson(event.target.result);
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  /* -------------------------------------------------------------
   * 13. 학생용 유인물 인쇄 & PDF 직접 저장 엔진
   * ----------------------------------------------------------- */
  openPrintHandoutModal() {
    if (this.printModal) {
      this.printModal.classList.add('open');
    }
  }

  closePrintHandoutModal() {
    if (this.printModal) {
      this.printModal.classList.remove('open');
    }
  }

  async exportStudentPdf() {
    this.showToast('학생용 유인물 PDF를 생성 중입니다...');
    try {
      const offscreen = document.createElement('canvas');
      const w = this.renderCanvas.width;
      const h = this.renderCanvas.height;
      if (!w || !h) {
        this.showToast('인쇄할 문서가 준비되지 않았습니다.', 'error');
        return;
      }

      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext('2d');

      // 1. 원본 캔버스 복사
      ctx.drawImage(this.renderCanvas, 0, 0);

      // 2. 마스킹 가림판(빈칸) 합성
      const masks = this.getCurrentMasks();
      const maskAll = this.maskAllForPrintCheckbox ? this.maskAllForPrintCheckbox.checked : true;

      masks.forEach((mask) => {
        // '모든 가림판 가리기' 옵션이 해제된 경우에만 이미 공개된 마스크 건너뜀
        if (!maskAll && mask.isRevealed) return;

        const mx = mask.x * w;
        const my = mask.y * h;
        const mw = mask.w * w;
        const mh = mask.h * h;

        ctx.save();

        // 학생용 유인물 빈칸 박스 (깔끔한 테두리와 음영)
        ctx.fillStyle = mask.style === 'sticky' ? '#fef9c3' : (mask.style === 'blue' ? '#eff6ff' : '#f8fafc');
        ctx.fillRect(mx, my, mw, mh);

        ctx.strokeStyle = mask.style === 'sticky' ? '#ca8a04' : (mask.style === 'blue' ? '#2563eb' : '#334155');
        ctx.lineWidth = Math.max(1.5, Math.min(3, Math.round(mh * 0.06)));
        ctx.strokeRect(mx, my, mw, mh);

        // 왼쪽 정렬 번호 배지 & 텍스트 렌더링
        const fontSize = Math.max(11, Math.min(22, Math.round(mh * 0.55)));
        ctx.font = `bold ${fontSize}px "Pretendard", -apple-system, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        const badgeW = Math.max(20, Math.round(fontSize * 1.5));
        const badgeH = Math.max(18, Math.round(fontSize * 1.3));
        const badgeX = mx + Math.max(6, Math.round(mw * 0.02));
        const badgeY = my + (mh - badgeH) / 2;

        // 배지 배경
        ctx.fillStyle = mask.style === 'sticky' ? '#ca8a04' : (mask.style === 'blue' ? '#2563eb' : '#334155');
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
          ctx.fill();
        } else {
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        }

        // 배지 숫자 (배지 사각형 중심)
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(String(mask.order), badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);

        // 추가 힌트/텍스트가 등록되어 있을 경우 왼쪽에 순차 배치
        if (mask.text && mask.text.trim()) {
          ctx.textAlign = 'left';
          ctx.fillStyle = mask.style === 'sticky' ? '#713f12' : '#0f172a';
          const textStartX = badgeX + badgeW + 8;
          const maxTextW = Math.max(20, mx + mw - textStartX - 6);
          ctx.fillText(mask.text, textStartX, my + mh / 2, maxTextW);
        }

        ctx.restore();
      });

      // 3. jsPDF 라이브러리를 통한 고품질 PDF 생성
      if (window.jspdf && window.jspdf.jsPDF) {
        const { jsPDF } = window.jspdf;
        const isLandscape = w > h;
        // 포인트(pt) 단위 변환 (픽셀의 75%)
        const pdfW = w * 0.75;
        const pdfH = h * 0.75;

        const pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [pdfW, pdfH]
        });

        const imgData = offscreen.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
        const fileName = `학생용_유인물_p${this.currentPage}.pdf`;
        pdf.save(fileName);
        this.showToast(`학생용 유인물 PDF 다운로드 완료: ${fileName}`);
      } else {
        // 라이브러리 미지원 시 고화질 이미지 다운로드 지원
        const link = document.createElement('a');
        link.download = `학생용_유인물_p${this.currentPage}.png`;
        link.href = offscreen.toDataURL('image/png');
        link.click();
        this.showToast(`학생용 유인물 이미지 저장 완료 (${link.download})`);
      }
      this.closePrintHandoutModal();
    } catch (err) {
      console.error('PDF 생성 실패:', err);
      this.showToast('PDF 파일 생성 중 오류가 발생했습니다. 브라우저 인쇄를 이용해주세요.', 'error');
    }
  }

  printHandout() {
    this.closePrintHandoutModal();
    const prevZoom = this.zoom;

    // 모든 가림판 가리기 옵션 처리
    const maskAll = this.maskAllForPrintCheckbox ? this.maskAllForPrintCheckbox.checked : true;
    const originalRevealedState = {};

    if (maskAll) {
      this.getCurrentMasks().forEach(m => {
        originalRevealedState[m.id] = m.isRevealed;
        m.isRevealed = false;
      });
      this.renderMasks();
    }

    // 인쇄 전 캔버스 줌 배율 일시 초기화 (A4 용지 맞춤 인쇄 보장)
    this.canvasWrapper.style.transform = 'none';
    this.canvasWrapper.style.margin = '0 auto';

    setTimeout(() => {
      window.print();
      // 인쇄 완료 후 원래 줌 및 가림판 상태 원상 복구
      setTimeout(() => {
        this.setZoom(prevZoom);
        if (maskAll) {
          this.getCurrentMasks().forEach(m => {
            if (originalRevealedState[m.id] !== undefined) {
              m.isRevealed = originalRevealedState[m.id];
            }
          });
          this.renderMasks();
          this.updateUI();
        }
      }, 600);
    }, 150);
  }

  /* -------------------------------------------------------------
   * 14. 유틸리티 (오디오 톤 & 토스트)
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
