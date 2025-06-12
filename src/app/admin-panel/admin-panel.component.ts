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
  };
  movement: 's' | 'w' | 'r';
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

    this.nadeForm = this.fb.group({
      map: [this.lastMap, Validators.required],
      utility: [this.lastUtility, Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      lineupImage: [''],
      positionImage: [''],
      jump: [false],
      mouseButton: ['l', Validators.required],
      movement: ['s', Validators.required]
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

  onSubmit() {
    if (this.nadeForm.valid) {
      const formValue = this.nadeForm.value;

      // Update and save the current map/utility preferences
      this.lastMap = formValue.map;
      this.lastUtility = formValue.utility;
      this.saveTemporalState();

      const newLineup: Lineup = {
        title: formValue.title,
        description: formValue.description,
        lineupImage: formValue.lineupImage || 'https://picsum.photos/600/400?random=4',
        positionImage: formValue.positionImage || 'https://picsum.photos/300/200?random=3',
        technique: {
          jump: formValue.jump,
          mouseButton: formValue.mouseButton
        },
        movement: formValue.movement
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
        mouseButton: 'l',
        movement: 's'
      });

      console.log('Updated data:', this.utilityData);
    }
  }

  async exportData() {
    const dataStr = JSON.stringify(this.utilityData, null, 2);

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
}
