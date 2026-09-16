/**
 * EduMask - 수업용 가림판 및 순차 공개 도구
 * Core Application Engine
 */

class EduMaskApp {
  constructor() {
    // 앱 상태
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
    // 구조: { [pageNum: number]: Array<{ id, order, x, y, w, h, style, isRevealed }> }
    this.pageMasks = { 1: [] };
    this.revealHistory = []; // 순차 공개 히스토리 (마스크 ID 배열)

    // 드로잉 인터랙션 상태
    this.isDrawing = false;
    this.drawStart = { x: 0, y: 0 };
    this.activeDrawingRect = null;

    // 오디오 컨텍스트 (효과음용)
    this.audioCtx = null;

    // DOM 요소 캐시
    this.initDOMElements();

    // 이벤트 리스너 등록
    this.bindEvents();

    // 기본 샘플 학습지 로드
    this.loadSampleWorksheet();
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
    this.fileInput = document.getElementById('fileInput');
    this.uploadBtn = document.getElementById('uploadBtn');
    this.zoomInBtn = document.getElementById('zoomInBtn');
    this.zoomOutBtn = document.getElementById('zoomOutBtn');
    this.zoomResetBtn = document.getElementById('zoomResetBtn');
    this.zoomLevelText = document.getElementById('zoomLevelText');
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

    // 사이드바 컨트롤
    this.maskCountBadge = document.getElementById('maskCountBadge');
    this.maskListContainer = document.getElementById('maskListContainer');
    this.clearAllMasksBtn = document.getElementById('clearAllMasksBtn');
    this.styleButtons = document.querySelectorAll('.style-picker-btn');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.importJsonBtn = document.getElementById('importJsonBtn');
    this.jsonFileInput = document.getElementById('jsonFileInput');

    // 하단 프레젠테이션 컨트롤러
    this.presentationBar = document.getElementById('presentationBar');
    this.prevRevealBtn = document.getElementById('prevRevealBtn');
    this.nextRevealBtn = document.getElementById('nextRevealBtn');
    this.hideAllBtn = document.getElementById('hideAllBtn');
    this.revealAllBtn = document.getElementById('revealAllBtn');
    this.progressRatioText = document.getElementById('progressRatioText');
    this.progressFill = document.getElementById('progressFill');

    // 모달 및 오버레이
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

    // 사이드바 토글
    this.toggleSidebarBtn.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
    });

    // 파일 업로드
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // 드래그 앤 드롭 파일 로딩
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dragDropOverlay.classList.add('active');
    });
    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) {
        this.dragDropOverlay.classList.remove('active');
      }
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dragDropOverlay.classList.remove('active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadFile(e.dataTransfer.files[0]);
      }
    });

    // 줌 조절
    this.zoomInBtn.addEventListener('click', () => this.setZoom(this.zoom + 0.15));
    this.zoomOutBtn.addEventListener('click', () => this.setZoom(this.zoom - 0.15));
    this.zoomResetBtn.addEventListener('click', () => this.setZoom(1.0));
    this.fitWidthBtn.addEventListener('click', () => this.fitToWidth());

    // 전체화면
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

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

    // 사이드바 액션
    this.clearAllMasksBtn.addEventListener('click', () => this.clearAllMasks());
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
      this.showToast('가림판 그리기 모드: 원하는 영역을 드래그하세요.');
    } else {
      this.modeDrawBtn.classList.remove('active');
      this.modePresentBtn.classList.add('active');
      this.viewportContainer.classList.remove('mode-draw');
      this.showToast('수업 진행 모드: Space 또는 → 키로 순서대로 지웁니다.');
    }
  }

  setZoom(value) {
    this.zoom = Math.max(0.3, Math.min(2.5, Math.round(value * 100) / 100));
    this.canvasWrapper.style.transform = `scale(${this.zoom})`;
    this.zoomLevelText.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  fitToWidth() {
    if (!this.renderCanvas.width) return;
    const availableWidth = this.viewportContainer.clientWidth - 80;
    const canvasWidth = this.renderCanvas.width;
    const calculatedZoom = availableWidth / canvasWidth;
    this.setZoom(calculatedZoom);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* -------------------------------------------------------------
   * 4. 파일 처리 (PDF & 이미지)
   * ----------------------------------------------------------- */
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadFile(file);
      e.target.value = ''; // 재선택 가능하도록 리셋
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

        // 새 이미지 로드 시 해당 페이지 마스크 초기화 또는 생성
        if (!this.pageMasks[1]) {
          this.pageMasks[1] = [];
        }

        this.renderImage(img);
        this.fitToWidth();
        this.renderMasks();
        this.updateUI();
        this.showToast(`이미지 로드 완료: ${file.name}`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  renderImage(img) {
    this.renderCanvas.width = img.naturalWidth || img.width;
    this.renderCanvas.height = img.naturalHeight || img.height;
    this.ctx.clearRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);
    this.ctx.drawImage(img, 0, 0);

    // 오버레이 크기 동기화
    this.maskOverlay.style.width = `${this.renderCanvas.width}px`;
    this.maskOverlay.style.height = `${this.renderCanvas.height}px`;
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
      this.renderPdfPage(this.currentPage);
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
      // 고해상도 렌더링을 위해 스케일 1.5 적용
      const viewport = page.getViewport({ scale: 1.5 });

      this.renderCanvas.width = viewport.width;
      this.renderCanvas.height = viewport.height;
      this.ctx.clearRect(0, 0, viewport.width, viewport.height);

      const renderContext = {
        canvasContext: this.ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // 오버레이 크기 동기화
      this.maskOverlay.style.width = `${viewport.width}px`;
      this.maskOverlay.style.height = `${viewport.height}px`;

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
    const h = 1350;
    this.renderCanvas.width = w;
    this.renderCanvas.height = h;
    this.maskOverlay.style.width = `${w}px`;
    this.maskOverlay.style.height = `${h}px`;

    const c = this.ctx;
    // 배경 깔끔한 종이 질감
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);

    // 상단 헤더 배너
    c.fillStyle = '#f1f5f9';
    c.fillRect(40, 40, w - 80, 100);
    c.strokeStyle = '#cbd5e1';
    c.lineWidth = 2;
    c.strokeRect(40, 40, w - 80, 100);

    c.fillStyle = '#1e293b';
    c.font = 'bold 30px "Pretendard", sans-serif';
    c.fillText('📖 [수업 예시] 오늘의 핵심 단어 & 퀴즈', 70, 95);

    c.fillStyle = '#64748b';
    c.font = '16px "Pretendard", sans-serif';
    c.fillText('가림판을 드래그하여 생성하거나, 하단의 [다음 가림판 공개(Space)]를 눌러보세요!', 70, 125);

    // 문제 1: 과학 퀴즈
    c.fillStyle = '#0f172a';
    c.font = 'bold 22px "Pretendard", sans-serif';
    c.fillText('Q1. 빛이 직진하다가 다른 물질의 경계면에서 꺾이는 현상을 무엇이라고 할까요?', 60, 200);

    c.font = '20px "Pretendard", sans-serif';
    c.fillStyle = '#334155';
    c.fillText('정답: [  빛의 굴절 현상 (Refraction)  ]', 80, 255);
    c.fillText('설명: 매질에 따라 빛의 속력이 달라지기 때문에 발생합니다.', 80, 295);

    // 구분선
    c.beginPath();
    c.strokeStyle = '#e2e8f0';
    c.lineWidth = 2;
    c.moveTo(60, 340);
    c.lineTo(w - 60, 340);
    c.stroke();

    // 문제 2: 영어 빈칸 채우기
    c.fillStyle = '#0f172a';
    c.font = 'bold 22px "Pretendard", sans-serif';
    c.fillText('Q2. 다음 문장의 빈칸에 들어갈 가장 알맞은 표현을 맞춰보세요.', 60, 400);

    c.font = '20px "Pretendard", sans-serif';
    c.fillStyle = '#334155';
    c.fillText('Sentence: "Actions speak louder than [   words   ]."', 80, 455);
    c.fillText('의미: 말보다 [   행동이나 실천   ]이 훨씬 더 중요하다.', 80, 495);

    // 구분선
    c.beginPath();
    c.moveTo(60, 545);
    c.lineTo(w - 60, 545);
    c.stroke();

    // 문제 3: 역사 & 상식
    c.fillStyle = '#0f172a';
    c.font = 'bold 22px "Pretendard", sans-serif';
    c.fillText('Q3. 조선 시대에 백성을 가르치는 바른 소리라는 뜻으로 창제된 글자는?', 60, 610);

    c.font = '22px "Pretendard", sans-serif';
    c.fillStyle = '#1e3a8a';
    c.fillText('정답: [   훈민정음 (Hunminjeongeum)   ]', 80, 665);
    c.fillStyle = '#334155';
    c.font = '18px "Pretendard", sans-serif';
    c.fillText('창제자: [  세종대왕 (King Sejong)  ], 1443년 창제', 80, 705);

    // 하단 장식 카드
    c.fillStyle = '#f8fafc';
    c.fillRect(60, 770, w - 120, 200);
    c.strokeStyle = '#93c5fd';
    c.lineWidth = 1.5;
    c.strokeRect(60, 770, w - 120, 200);

    c.fillStyle = '#2563eb';
    c.font = 'bold 20px "Pretendard", sans-serif';
    c.fillText('💡 EduMask 선생님 꿀팁', 90, 815);

    c.fillStyle = '#475569';
    c.font = '17px "Pretendard", sans-serif';
    c.fillText('1. 마우스로 드래그하면 즉시 가림판이 생기고 ①, ②, ③ 번호가 자동 부여됩니다.', 90, 855);
    c.fillText('2. [수업 진행] 모드에서 키보드 Space 바를 누르면 번호 순서대로 스무스하게 열립니다.', 90, 895);
    c.fillText('3. 학생이 특정 번호를 먼저 질문하면, 해당 가림판을 마우스로 콕 클릭해보세요!', 90, 935);

    // 기본 샘플 가림판 4개 자동 등록
    this.pageMasks[1] = [
      {
        id: 'sample_mask_1',
        order: 1,
        x: 135 / w,
        y: 228 / h,
        w: 320 / w,
        h: 40 / h,
        style: 'slate',
        isRevealed: false
      },
      {
        id: 'sample_mask_2',
        order: 2,
        x: 345 / w,
        y: 428 / h,
        w: 120 / w,
        h: 40 / h,
        style: 'sticky',
        isRevealed: false
      },
      {
        id: 'sample_mask_3',
        order: 3,
        x: 140 / w,
        y: 638 / h,
        w: 350 / w,
        h: 42 / h,
        style: 'blue',
        isRevealed: false
      },
      {
        id: 'sample_mask_4',
        order: 4,
        x: 155 / w,
        y: 680 / h,
        w: 240 / w,
        h: 36 / h,
        style: 'hint',
        isRevealed: false
      }
    ];

    this.renderMasks();
    this.updateUI();
    this.fitToWidth();
  }

  /* -------------------------------------------------------------
   * 6. 마스킹 인터랙션 (드래그 박스 생성)
   * ----------------------------------------------------------- */
  onPointerDown(e) {
    // 그리기 모드가 아니거나, 마우스 우클릭인 경우 무시
    if (this.mode !== 'draw' || e.button !== 0) return;

    // 이미 존재하는 마스크 박스를 클릭한 경우 드래그 시작 방지
    if (e.target.closest('.mask-box')) return;

    const rect = this.maskOverlay.getBoundingClientRect();
    // 줌 스케일을 반영한 실제 오버레이 내부 좌표 계산
    const currentScale = this.zoom;
    const startX = (e.clientX - rect.left) / currentScale;
    const startY = (e.clientY - rect.top) / currentScale;

    this.isDrawing = true;
    this.drawStart = { x: startX, y: startY };

    // 임시 가이드 사각형 생성
    this.activeDrawingRect = document.createElement('div');
    this.activeDrawingRect.className = 'drawing-rect';
    this.activeDrawingRect.style.left = `${startX}px`;
    this.activeDrawingRect.style.top = `${startY}px`;
    this.activeDrawingRect.style.width = '0px';
    this.activeDrawingRect.style.height = '0px';
    this.maskOverlay.appendChild(this.activeDrawingRect);

    // 터치 스크롤 등 기본 동작 방지
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

    // 임시 사각형 DOM 제거
    if (this.activeDrawingRect.parentNode) {
      this.activeDrawingRect.parentNode.removeChild(this.activeDrawingRect);
    }
    this.activeDrawingRect = null;

    // 너무 작은 크기 (클릭 실수 등)는 마스크 생성 무시
    if (pixelW < 14 || pixelH < 14) return;

    // 상대 비율(0.0 ~ 1.0)로 변환하여 저장 (반응형/줌 완벽 호환)
    const newMask = {
      id: 'mask_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      order: (this.pageMasks[this.currentPage]?.length || 0) + 1,
      x: Math.max(0, Math.min(1, pixelX / overlayW)),
      y: Math.max(0, Math.min(1, pixelY / overlayH)),
      w: Math.max(0, Math.min(1, pixelW / overlayW)),
      h: Math.max(0, Math.min(1, pixelH / overlayH)),
      style: this.activeStyle,
      isRevealed: false
    };

    if (!this.pageMasks[this.currentPage]) {
      this.pageMasks[this.currentPage] = [];
    }
    this.pageMasks[this.currentPage].push(newMask);

    this.playTone(520, 0.08); // 생성 효과음
    this.renderMasks();
    this.updateUI();
  }

  /* -------------------------------------------------------------
   * 7. 마스크 DOM 렌더링
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

      // 번호 배지
      const badge = document.createElement('div');
      badge.className = 'mask-badge';
      badge.textContent = mask.order;
      el.appendChild(badge);

      // 삭제 버튼 (편집 모드 시 마우스 호버 표시)
      const delBtn = document.createElement('button');
      delBtn.className = 'mask-delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.title = '이 가림판 삭제';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMask(mask.id);
      });
      el.appendChild(delBtn);

      // 마스크 클릭 시 개별 토글
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMask(mask.id);
      });

      this.maskOverlay.appendChild(el);
    });

    this.renderSidebarList();
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

      row.innerHTML = `
        <div class="mask-info">
          <div class="mask-num-badge">${mask.order}</div>
          <span class="mask-title">가림판 #${mask.order} (${mask.isRevealed ? '공개됨' : '가림'})</span>
        </div>
        <div class="mask-actions">
          <button class="btn btn-sm btn-icon-only toggle-row-btn" title="${mask.isRevealed ? '다시 가리기' : '공개하기'}">
            ${mask.isRevealed ? '🔒' : '👁️'}
          </button>
          <button class="btn btn-sm btn-danger btn-icon-only del-row-btn" title="삭제">
            &times;
          </button>
        </div>
      `;

      row.querySelector('.toggle-row-btn').addEventListener('click', () => {
        this.toggleMask(mask.id);
      });

      row.querySelector('.del-row-btn').addEventListener('click', () => {
        this.deleteMask(mask.id);
      });

      this.maskListContainer.appendChild(row);
    });
  }

  /* -------------------------------------------------------------
   * 8. 순차 공개 (지우기) 엔진
   * ----------------------------------------------------------- */
  getCurrentMasks() {
    return this.pageMasks[this.currentPage] || [];
  }

  revealNext() {
    const masks = this.getCurrentMasks();
    // 아직 지워지지 않은 마스크 중 순번이 가장 빠른 것 탐색
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

    this.playTone(660, 0.12); // 경쾌한 공개 사운드
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
      this.playTone(440, 0.08); // 복구 사운드
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
      // 순번 재정렬 (1, 2, 3...)
      masks.forEach((m, idx) => m.order = idx + 1);
      this.revealHistory = this.revealHistory.filter(id => id !== maskId);
      this.renderMasks();
      this.updateUI();
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
      this.showToast('가림판이 모두 삭제되었습니다.');
    }
  }

  /* -------------------------------------------------------------
   * 9. UI 상태 및 진행 바 업데이트
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
   * 10. 단축키 처리
   * ----------------------------------------------------------- */
  handleKeyDown(e) {
    // 모달이나 텍스트 인풋 포커스 중일 때는 단축키 무시
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

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
   * 11. 사전 준비 데이터 저장 및 불러오기 (JSON)
   * ----------------------------------------------------------- */
  exportToJson() {
    const exportData = {
      app: 'EduMask',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalPages: this.totalPages,
      pageMasks: this.pageMasks
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edumask_preset_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('가림판 설정 파일(.json)이 저장되었습니다.');
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
          this.showToast('올바른 EduMask 설정 파일이 아닙니다.', 'error');
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
   * 12. 유틸리티 (웹 오디오 톤 & 토스트)
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
      // 오디오 미지원 환경 무시
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
  window.eduMaskApp = new EduMaskApp();
});
