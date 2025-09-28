import { Component, ChangeDetectionStrategy, signal, inject, OnInit, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

interface Task {
  id: number;
  text: string;
  completed: boolean;
  editing: boolean;
  dueDate?: string;
  notified?: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [GeminiService],
})
export class AppComponent implements OnInit {
  private geminiService = inject(GeminiService);

  tasks: WritableSignal<Task[]> = signal([
    { id: 1, text: 'Draft Q3 marketing report', completed: false, editing: false },
    { id: 2, text: 'Schedule weekly project sync', completed: false, editing: false, dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16) },
    { id: 3, text: 'Buy groceries for the week', completed: true, editing: false },
  ]);

  sortedTasks = computed(() => {
    return this.tasks().slice().sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return a.dueDate ? -1 : b.dueDate ? 1 : 0;
    });
  });
  
  newTask = signal<string>('');
  newTaskDueDate = signal<string>('');
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.requestNotificationPermission();
    setInterval(() => this.checkReminders(), 30000); // Check every 30 seconds
  }

  updateNewTask(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newTask.set(input.value);
  }

  updateNewTaskDueDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newTaskDueDate.set(input.value);
  }

  addTask(): void {
    const taskText = this.newTask().trim();
    if (taskText) {
      const newTask: Task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        editing: false,
        dueDate: this.newTaskDueDate() || undefined
      };
      this.tasks.update(currentTasks => [newTask, ...currentTasks]);
      this.newTask.set('');
      this.newTaskDueDate.set('');
    }
  }

  deleteTask(taskId: number): void {
    this.tasks.update(currentTasks => currentTasks.filter(task => task.id !== taskId));
  }

  toggleComplete(taskToToggle: Task): void {
    this.tasks.update(currentTasks =>
      currentTasks.map(task =>
        task.id === taskToToggle.id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  startEditing(taskToEdit: Task): void {
    this.tasks.update(currentTasks =>
      currentTasks.map(task => ({
        ...task,
        editing: task.id === taskToEdit.id,
      }))
    );
  }

  saveEdit(taskToSave: Task, newText: string): void {
    this.tasks.update(currentTasks =>
      currentTasks.map(task =>
        task.id === taskToSave.id ? { ...task, text: newText.trim(), editing: false } : task
      )
    );
  }
  
  cancelEdit(taskToCancel: Task): void {
     this.tasks.update(currentTasks =>
      currentTasks.map(task =>
        task.id === taskToCancel.id ? { ...task, editing: false } : task
      )
    );
  }

  async getInspiration(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const idea = await this.geminiService.generateTaskIdea();
      this.newTask.set(idea);
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- Reminder Logic ---
  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  private checkReminders(): void {
    const now = new Date();
    this.tasks.update(currentTasks => {
      currentTasks.forEach(task => {
        if (task.dueDate && new Date(task.dueDate) <= now && !task.completed && !task.notified) {
          this.showNotification(task);
          task.notified = true; // Mark as notified to prevent repeated notifications
        }
      });
      return [...currentTasks]; // Return a new array to trigger signal update
    });
  }

  private showNotification(task: Task): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('AI Reminder!', {
        body: task.text,
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iIzgxOGNmOCI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTAuODY4IDIuODg0Yy4zMjEtLjc3MiAxLjQxNS0uNzcyIDEuNzM2IDBsMS44MyA0LjQxOGEuNzUuNzUgMCAwMC43MDIuNDY1bDQuODIzLjcwMWMuODIuMTE5IDEuMTQ3IDEuMTIxLjU1NCAxLjcwMmwtMy40OSAzLjQwMmEuNzUuNzUgMCAwMC0uMjE1LjgyM2wuODI0IDQuODA1Yy4xNCAwLjgxNy0uNzE0IDEuNDQtMS40NDIgMS4wNDNMMTAuOTkgMTYuMjFhLjc1Ljc1IDAgMDAtLjc4IDBsLTQuMyAyLjI2Yy0uNzI4LjM5Ny0xLjU4Mi0uMjI2LTEuNDQyLTEuMDQzbC44MjQtNC44MDVhLjc1LjcUgMCAwMC0uMjE1LS44MjNsLTMuNDktMy40MDJjLS41OTMtLjU4MS0uMjY2LTEuNTgzLjU1NC0xLjcwMmwtNC44MjMtLjcwMWEuNzUuNzUgMCAwMC43MDItLjQ2NWwxLjgzLTQuNDE4eiIgY2xpcC1ydWxlPSJldmVub2RkIiAvPjwvc3ZnPg==',
      });
    }
  }
}