import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
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
}

interface UtilityData {
  [map: string]: {
    [utility: string]: Lineup[];
  };
}

interface FlattenedEntry extends Lineup {
  map: string;
  utility: string;
  index: number;
}

interface GroupedNade {
  baseName: string;
  lineupImage?: string;
  positionImage?: string;
  hasLineup: boolean;
  hasPosition: boolean;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent implements OnInit {
  nadeForm: FormGroup;
  utilityData: UtilityData = {};
  flattenedEntries: FlattenedEntry[] = [];
  filteredEntries: FlattenedEntry[] = [];
  isLoading = false;
  message = '';

  // Filter properties
  selectedMapFilter = 'all';
  selectedUtilityFilter = 'all';

  // File explorer properties
  showFileExplorer = false;
  currentImageField = '';
  availableImages: string[] = [];
  groupedNades: GroupedNade[] = [];
  allScannedImages: string[] = [];
  selectedDirectory = '';
  imageDirectory = '';
  imageDirectoryHandle: any = null;
  imagePathPrefix = '';

  // Temporal state storage for form values
  private lastMap = 'mirage';
  private lastUtility = 'smokes';

  maps = [
    { key: 'mirage', name: 'Mirage' },
    { key: 'dust2', name: 'Dust2' },
    { key: 'inferno', name: 'Inferno' },
    { key: 'anubis', name: 'Anubis' },
    { key: 'ancient', name: 'Ancient' }
  ];

  utilities = [
    { key: 'smokes', name: 'Smokes' },
    { key: 'flashes', name: 'Flashes' },
    { key: 'he', name: 'HE Grenades' },
    { key: 'molotov', name: 'Molotovs' }
  ];

  mouseButtons = [
    { key: 'l', name: 'Left Click' },
    { key: 'r', name: 'Right Click' },
    { key: 'lr', name: 'Left + Right Click' }
  ];

  movements = [
    { key: 's', name: 'Stationary' },
    { key: 'w', name: 'Walking' },
    { key: 'r', name: 'Running' }
  ];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    // Load saved preferences from localStorage
    this.loadTemporalState();
    this.loadImageDirectory();
    this.loadImagePathPrefix();

    this.nadeForm = this.fb.group({
      map: [this.lastMap, Validators.required],
      utility: [this.lastUtility, Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      lineupImage: [''],
      positionImage: [''],
      jump: [false],
      crouch: [false],
      mouseButton: ['l', Validators.required],
      movement: ['s', Validators.required],
      url: ['']
    });

    // Subscribe to changes to save state
    this.nadeForm.get('map')?.valueChanges.subscribe(value => {
      this.lastMap = value;
      this.saveTemporalState();
    });

    this.nadeForm.get('utility')?.valueChanges.subscribe(value => {
      this.lastUtility = value;
      this.saveTemporalState();
    });
  }

  private loadTemporalState() {
    try {
      const saved = localStorage.getItem('nadeFormState');
      if (saved) {
        const state = JSON.parse(saved);
        this.lastMap = state.map || 'mirage';
        this.lastUtility = state.utility || 'smokes';
        console.log('Loaded temporal state:', state);
      }
    } catch (error) {
      console.warn('Failed to load temporal state:', error);
    }
  }

  private saveTemporalState() {
    try {
      const state = {
        map: this.lastMap,
        utility: this.lastUtility
      };
      localStorage.setItem('nadeFormState', JSON.stringify(state));
      console.log('Saved temporal state:', state);
    } catch (error) {
      console.warn('Failed to save temporal state:', error);
    }
  }

  private loadImageDirectory() {
    try {
      const saved = localStorage.getItem('imageDirectory');
      if (saved) {
        this.imageDirectory = saved;
        console.log('Loaded image directory:', saved);
      }
    } catch (error) {
      console.warn('Failed to load image directory:', error);
    }
  }

  private saveImageDirectory() {
    try {
      localStorage.setItem('imageDirectory', this.imageDirectory);
      console.log('Saved image directory:', this.imageDirectory);
    } catch (error) {
      console.warn('Failed to save image directory:', error);
    }
  }

  private loadImagePathPrefix() {
    try {
      const saved = localStorage.getItem('imagePathPrefix');
      if (saved) {
        this.imagePathPrefix = saved;
        console.log('Loaded image path prefix:', saved);
      }
    } catch (error) {
      console.warn('Failed to load image path prefix:', error);
    }
  }

  private saveImagePathPrefix() {
    try {
      localStorage.setItem('imagePathPrefix', this.imagePathPrefix);
      console.log('Saved image path prefix:', this.imagePathPrefix);
    } catch (error) {
      console.warn('Failed to save image path prefix:', error);
    }
  }

  async selectImageDirectory() {
    if ('showDirectoryPicker' in window) {
      try {
        this.imageDirectoryHandle = await (window as any).showDirectoryPicker();
        this.imageDirectory = this.imageDirectoryHandle.name;
        this.saveImageDirectory();
        this.message = `Image directory set to: ${this.imageDirectory}`;
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('Directory picker failed:', error);
          this.message = 'Failed to select directory';
        }
      }
    } else {
      this.message = 'Directory picker not supported in this browser. Use Chrome/Edge.';
    }
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    try {
      this.utilityData = await this.http.get<UtilityData>('data/data.json').toPromise() || {};
      this.flattenEntries();
      this.applyFilters();
    } catch (error) {
      console.error('Failed to load data:', error);
      this.message = 'Failed to load existing data';
    } finally {
      this.isLoading = false;
    }
  }

  flattenEntries() {
    this.flattenedEntries = [];
    Object.keys(this.utilityData).forEach(map => {
      Object.keys(this.utilityData[map]).forEach(utility => {
        this.utilityData[map][utility].forEach((lineup, index) => {
          this.flattenedEntries.push({
            ...lineup,
            technique: {
              jump: lineup.technique?.jump || false,
              mouseButton: lineup.technique?.mouseButton || 'l',
              crouch: lineup.technique?.crouch || false
            },
            url: lineup.url || '',
            map,
            utility,
            index
          });
        });
      });
    });
  }

  applyFilters() {
    this.filteredEntries = this.flattenedEntries.filter(entry => {
      const mapMatch = this.selectedMapFilter === 'all' || entry.map === this.selectedMapFilter;
      const utilityMatch = this.selectedUtilityFilter === 'all' || entry.utility === this.selectedUtilityFilter;
      return mapMatch && utilityMatch;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  deleteEntry(entry: FlattenedEntry) {
    if (confirm(`Are you sure you want to delete "${entry.title}"?`)) {
      const mapData = this.utilityData[entry.map];
      if (mapData && mapData[entry.utility]) {
        mapData[entry.utility].splice(entry.index, 1);
        this.flattenEntries();
        this.applyFilters();
        this.message = `Successfully deleted "${entry.title}"`;
      }
    }
  }

  getMapName(key: string): string {
    return this.maps.find(m => m.key === key)?.name || key;
  }

  getUtilityName(key: string): string {
    return this.utilities.find(u => u.key === key)?.name || key;
  }

  getMouseButtonName(key: string): string {
    return this.mouseButtons.find(m => m.key === key)?.name || key;
  }

  getMovementName(key: string): string {
    return this.movements.find(m => m.key === key)?.name || key;
  }

  onImagePathPrefixChange(event: any) {
    this.imagePathPrefix = event.target.value;
    this.saveImagePathPrefix();
  }

  onSubmit() {
    if (this.nadeForm.valid) {
      const formValue = this.nadeForm.value;

      // Update and save the current map/utility preferences
      this.lastMap = formValue.map;
      this.lastUtility = formValue.utility;
      this.saveTemporalState();

      // Apply prefix to image paths if they don't already have it
      let lineupImage = formValue.lineupImage;
      let positionImage = formValue.positionImage;

      if (lineupImage && this.imagePathPrefix && !lineupImage.startsWith('http')) {
        lineupImage = this.applyPrefixToPath(lineupImage, formValue.map);
      }

      if (positionImage && this.imagePathPrefix && !positionImage.startsWith('http')) {
        positionImage = this.applyPrefixToPath(positionImage, formValue.map);
      }

      const newLineup: Lineup = {
        title: formValue.title,
        description: formValue.description,
        lineupImage: lineupImage || 'https://picsum.photos/600/400?random=4',
        positionImage: positionImage || 'https://picsum.photos/300/200?random=3',
        technique: {
          jump: formValue.jump,
          mouseButton: formValue.mouseButton,
          crouch: formValue.crouch
        },
        movement: formValue.movement,
        url: formValue.url || ''
      };

      // Initialize map and utility arrays if they don't exist
      if (!this.utilityData[formValue.map]) {
        this.utilityData[formValue.map] = {};
      }
      if (!this.utilityData[formValue.map][formValue.utility]) {
        this.utilityData[formValue.map][formValue.utility] = [];
      }

      // Add the new lineup
      this.utilityData[formValue.map][formValue.utility].push(newLineup);
      this.flattenEntries();
      this.applyFilters();

      this.message = `Successfully added "${formValue.title}" to ${formValue.map} ${formValue.utility}`;

      // Reset form but keep map and utility preferences
      this.nadeForm.reset({
        map: this.lastMap,
        utility: this.lastUtility,
        jump: false,
        crouch: false,
        mouseButton: 'l',
        movement: 's',
        url: ''
      });

      console.log('Updated data:', this.utilityData);
    }
  }

  async exportData() {
    // Normalize the data to ensure all entries have consistent structure
    const normalizedData = this.normalizeDataForExport(this.utilityData);
    const dataStr = JSON.stringify(normalizedData, null, 2);

    // Check if the File System Access API is supported
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: 'updated-data.json',
          types: [
            {
              description: 'JSON files',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(dataStr);
        await writable.close();

        this.message = 'Data exported successfully!';
      } catch (error) {
        // User cancelled the save dialog
        if ((error as any).name !== 'AbortError') {
          console.error('Export failed:', error);
          this.message = 'Export failed. Please try again.';
        }
      }
    } else {
      // Fallback for browsers that don't support File System Access API
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'updated-data.json';
      link.click();
      URL.revokeObjectURL(url);
    }
  }

  private normalizeDataForExport(data: UtilityData): UtilityData {
    const normalizedData: UtilityData = {};

    Object.keys(data).forEach(map => {
      normalizedData[map] = {};
      Object.keys(data[map]).forEach(utility => {
        normalizedData[map][utility] = data[map][utility].map(lineup => ({
          ...lineup,
          technique: {
            jump: lineup.technique?.jump || false,
            mouseButton: lineup.technique?.mouseButton || 'l',
            crouch: lineup.technique?.crouch || false
          },
          url: lineup.url || ''
        }));
      });
    });

    return normalizedData;
  }

  getUtilityFilterKeyword(utility: string): string {
    const utilityKeywords: { [key: string]: string } = {
      'smokes': 'smoke',
      'flashes': 'flash',
      'he': 'he|grenade',
      'molotov': 'molotov|incendiary'
    };
    return utilityKeywords[utility] || utility;
  }

  private groupImagesByBaseName(images: string[]): GroupedNade[] {
    const grouped: { [baseName: string]: GroupedNade } = {};

    images.forEach(imagePath => {
      const fileName = imagePath.split('/').pop() || imagePath;
      const nameWithoutExt = fileName.replace(/\.(jpg|jpeg|png|gif|bmp|webp)$/i, '');

      let baseName = nameWithoutExt;
      let isLineup = false;
      let isPosition = false;

      if (nameWithoutExt.endsWith('-lineup')) {
        baseName = nameWithoutExt.replace(/-lineup$/, '');
        isLineup = true;
      } else if (nameWithoutExt.endsWith('-position')) {
        baseName = nameWithoutExt.replace(/-position$/, '');
        isPosition = true;
      }

      if (!grouped[baseName]) {
        grouped[baseName] = {
          baseName,
          hasLineup: false,
          hasPosition: false
        };
      }

      if (isLineup) {
        grouped[baseName].lineupImage = imagePath;
        grouped[baseName].hasLineup = true;
      } else if (isPosition) {
        grouped[baseName].positionImage = imagePath;
        grouped[baseName].hasPosition = true;
      }
    });

    return Object.values(grouped).filter(nade => nade.hasLineup || nade.hasPosition);
  }

  private filterImagesByUtility(images: string[], utility: string): string[] {
    if (!utility || utility === 'all') {
      return images;
    }

    const keyword = this.getUtilityFilterKeyword(utility);
    const regex = new RegExp(keyword, 'i');

    return images.filter(imageName => {
      const fileName = imageName.toLowerCase();
      return regex.test(fileName);
    });
  }

  async scanDirectoryForImages() {
    if (!this.imageDirectoryHandle) {
      this.availableImages = ['No directory selected'];
      return;
    }

    this.allScannedImages = [];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

    try {
      // Scan the main directory
      await this.scanDirectory(this.imageDirectoryHandle, '', imageExtensions);

      if (this.allScannedImages.length === 0) {
        this.availableImages = ['No image files found in selected directory'];
        this.groupedNades = [];
      } else {
        this.allScannedImages.sort();

        const currentUtility = this.nadeForm.get('utility')?.value;
        const filteredImages = this.filterImagesByUtility(this.allScannedImages, currentUtility);

        this.groupedNades = this.groupImagesByBaseName(filteredImages);

        if (this.groupedNades.length === 0) {
          this.availableImages = [`No grouped nades found for "${this.getUtilityName(currentUtility)}" (searched for "${this.getUtilityFilterKeyword(currentUtility)}")`];
        } else {
          // Create display names for the grouped nades
          this.availableImages = this.groupedNades.map(nade => {
            const status = [];
            if (nade.hasLineup) status.push('lineup');
            if (nade.hasPosition) status.push('position');
            return `${nade.baseName} (${status.join(', ')})`;
          });
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
      this.availableImages = ['Error scanning directory: ' + (error as any).message];
      this.groupedNades = [];
    }
  }

  private async scanDirectory(dirHandle: any, relativePath: string, imageExtensions: string[]) {
    try {
      for await (const entry of dirHandle.values()) {
        const fullPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
          const fileName = entry.name.toLowerCase();
          if (imageExtensions.some(ext => fileName.endsWith(ext))) {
            this.allScannedImages.push(fullPath);
          }
        } else if (entry.kind === 'directory') {
          // Recursively scan subdirectories (limit depth to avoid infinite loops)
          const depth = relativePath.split('/').length;
          if (depth < 3) { // Max 3 levels deep
            await this.scanDirectory(entry, fullPath, imageExtensions);
          }
        }
      }
    } catch (error) {
      console.warn('Error scanning subdirectory:', relativePath, error);
    }
  }

  selectImage(displayName: string) {
    if (displayName.startsWith('No') ||
        displayName.startsWith('Error') ||
        displayName.startsWith('Please select')) {
      return;
    }

    // Find the corresponding grouped nade
    const selectedIndex = this.availableImages.indexOf(displayName);
    if (selectedIndex === -1 || selectedIndex >= this.groupedNades.length) {
      return;
    }

    const selectedNade = this.groupedNades[selectedIndex];
    const currentMap = this.nadeForm.get('map')?.value;

    // Apply prefix to both image paths
    let lineupPath = '';
    let positionPath = '';

    if (selectedNade.lineupImage) {
      lineupPath = this.applyPrefixToPath(selectedNade.lineupImage, currentMap);
    }

    if (selectedNade.positionImage) {
      positionPath = this.applyPrefixToPath(selectedNade.positionImage, currentMap);
    }

    // Set both form controls
    if (lineupPath) {
      this.nadeForm.get('lineupImage')?.setValue(lineupPath);
    }
    if (positionPath) {
      this.nadeForm.get('positionImage')?.setValue(positionPath);
    }

    this.closeFileExplorer();

    // Show confirmation message
    const setPaths = [];
    if (lineupPath) setPaths.push('lineup');
    if (positionPath) setPaths.push('position');
    this.message = `Set ${setPaths.join(' and ')} image(s) for: ${selectedNade.baseName}`;
  }

  private applyPrefixToPath(imagePath: string, mapName?: string): string {
    if (this.imagePathPrefix) {
      const cleanPrefix = this.imagePathPrefix.replace(/\/$/, '');
      const cleanImageName = imagePath.replace(/^\//, '');
      const mapFolder = mapName ? mapName.toLowerCase() : '';

      if (mapFolder) {
        return `${cleanPrefix}/${mapFolder}/${cleanImageName}`;
      } else {
        return `${cleanPrefix}/${cleanImageName}`;
      }
    }
    return imagePath;
  }

  async openFileExplorer(fieldName: string) {
    this.currentImageField = fieldName;
    this.showFileExplorer = true;

    if (this.imageDirectoryHandle) {
      this.selectedDirectory = this.imageDirectory;
      await this.scanDirectoryForImages();
    } else {
      this.selectedDirectory = 'No directory selected';
      this.availableImages = [
        'Please select an image directory first using the "Select Image Directory" button above.'
      ];
    }
  }

  closeFileExplorer() {
    this.showFileExplorer = false;
    this.currentImageField = '';
    this.availableImages = [];
    this.groupedNades = [];
    this.selectedDirectory = '';
  }
}
