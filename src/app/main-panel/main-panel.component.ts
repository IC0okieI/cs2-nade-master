import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Lineup {
  title: string;
  description: string;
  lineupImage: string;
  positionImage: string;
  technique: {
    jump: boolean;
    mouseButton: 'l' | 'r' | 'lr';
    crouch: boolean;
  };
  movement: 's' | 'w' | 'r';
  url: string;
  smokeBundle: string;
}

interface UtilityData {
  [map: string]: {
    [utility: string]: Lineup[];
  };
}

@Component({
  selector: 'app-main-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-panel.component.html',
  styleUrl: './main-panel.component.css'
})
export class MainPanelComponent implements OnInit {
  title = 'NadeHelper';
  isDarkMode = true; // Default to dark mode
  isCompactView = false; // New property for view toggle

  utilityData: UtilityData = {};
  currentUtility = 'smokes';
  currentMap = 'mirage';
  currentLineups: Lineup[] = [];
  viewedLineups = new Set<string>();
  isLoading = true;
  loadError = false;

  // Zoom settings
  lineupZoomLevel = 2.5; // 1.0 = 100%, 1.5 = 150%, etc.
  positionZoomLevel = 1.5;

  utilities = [
    { key: 'smokes', name: 'Smokes', icon: '💨' },
    { key: 'flashes', name: 'Flashes', icon: '⚡' },
    { key: 'he', name: 'HE Grenades', icon: '💥' },
    { key: 'molotov', name: 'Molotovs', icon: '🔥' }
  ];

  maps = [
    { key: 'mirage', name: 'Mirage' },
    { key: 'dust2', name: 'Dust2' },
    { key: 'inferno', name: 'Inferno' },
    { key: 'anubis', name: 'Anubis' },
    { key: 'ancient', name: 'Ancient' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSavedTheme();
    this.loadData();
  }

  async loadData() {
    try {
      this.isLoading = true;
      this.loadError = false;

      const timestamp = Date.now();
      this.utilityData = await this.http.get<UtilityData>(`https://raw.githubusercontent.com/IC0okieI/cs2-nade-master/master/public/data/data.json?ts=${timestamp}`).toPromise() || {};

      // this.utilityData = await this.http.get<UtilityData>('data/data.json').toPromise() || {};

      this.updateContent();
    } catch (error) {
      console.error('Failed to load utility data:', error);
      this.loadError = true;
      // Fallback to empty data structure
      this.utilityData = {};
    } finally {
      this.isLoading = false;
    }
  }

  selectUtility(utilityKey: string) {
    this.currentUtility = utilityKey;
    this.updateContent();
  }

  selectMap(mapKey: string) {
    this.currentMap = mapKey;
    this.updateContent();
  }

  updateContent() {
    if (Object.keys(this.utilityData).length === 0) {
      return;
    }

    this.currentLineups = this.utilityData[this.currentMap]?.[this.currentUtility] || [];
  }

  toggleImage(lineup: Lineup, event: Event) {
    const target = event.target as HTMLElement;
    const card = target.closest('.lineup-card');
    if (!card) return;

    const mainImage = card.querySelector('.lineup-screenshot') as HTMLImageElement;
    const positionImage = card.querySelector('.position-screenshot') as HTMLImageElement;

    if (!mainImage || !positionImage) return;

    const currentMainSrc = mainImage.src;
    const lineupImageName = lineup.lineupImage.split('/').pop();

    if (currentMainSrc.includes(lineupImageName || '')) {
      mainImage.src = lineup.positionImage;
      positionImage.src = lineup.lineupImage;
    } else {
      mainImage.src = lineup.lineupImage;
      positionImage.src = lineup.positionImage;
    }
  }

  getContentTitle(): string {
    const utilityName = this.currentUtility.charAt(0).toUpperCase() + this.currentUtility.slice(1);
    const mapName = this.currentMap.charAt(0).toUpperCase() + this.currentMap.slice(1);
    return `${utilityName} Lineups - ${mapName}`;
  }

  getUtilityCount(utilityKey: string): number {
    return this.utilityData[this.currentMap]?.[utilityKey]?.length || 0;
  }

  getMouseButtonIcon(mouseButton: string): string {
    switch (mouseButton) {
      case 'l':
        return '🖱️L';
      case 'r':
        return '🖱️R';
      case 'lr':
        return '🖱️LR';
      default:
        return '🖱️';
    }
  }

  getMovementText(movement: string): string {
    switch (movement) {
      case 's':
        return 'Stationary';
      case 'w':
        return 'Walking';
      case 'r':
        return 'Running';
      default:
        return movement;
    }
  }

  getLineupImageStyle(): any {
    return {
      transform: `scale(${this.lineupZoomLevel})`,
      'transform-origin': 'center center'
    };
  }

  getPositionImageStyle(): any {
    return {
      transform: `scale(${this.positionZoomLevel})`,
      'transform-origin': 'center center'
    };
  }

  getMainImageStyle(lineup: Lineup, currentSrc: string): any {
    const lineupImageName = lineup.lineupImage.split('/').pop();
    const isShowingLineup = currentSrc.includes(lineupImageName || '');
    const zoomLevel = isShowingLineup ? this.lineupZoomLevel : this.positionZoomLevel;

    return {
      transform: `scale(${zoomLevel})`,
      'transform-origin': 'center center'
    };
  }

  getSmallImageStyle(lineup: Lineup, currentMainSrc: string): any {
    const lineupImageName = lineup.lineupImage.split('/').pop();
    const isMainShowingLineup = currentMainSrc.includes(lineupImageName || '');
    const zoomLevel = isMainShowingLineup ? this.positionZoomLevel : this.lineupZoomLevel;

    return {
      transform: `scale(${zoomLevel})`,
      'transform-origin': 'center center'
    };
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleView() {
    this.isCompactView = !this.isCompactView;
  }

  hasYouTubeUrl(lineup: Lineup): boolean {
    // check if the url field has a string or if it was ""
    return lineup.url != null && lineup.url.trim() !== '';
  }

  openYouTubeUrl(lineup: Lineup) {
    const youtubeUrl = lineup.url;
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank');
    }
  }

  isSmokeBundle(lineup: Lineup): boolean {
    return lineup.smokeBundle != null && lineup.smokeBundle.trim() !== '';
  }

  getBundleImage(lineup: Lineup): string {
    return this.isSmokeBundle(lineup) ? lineup.smokeBundle : lineup.lineupImage;
  }

  private loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    }
    this.applyTheme();
  }

  private applyTheme() {
    // Apply theme to document for global styles (background)
    if (this.isDarkMode) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
}
