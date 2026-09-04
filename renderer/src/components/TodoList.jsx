import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, ChevronDown, ListChecks } from 'lucide-react';

export function TodoList({ todos = [] }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!todos || todos.length === 0) return null;

  const completed = todos.filter((t) => t.status === 'completed').length;
  const inProgress = todos.filter((t) => t.status === 'in_progress').length;
  const pending = todos.filter((t) => t.status === 'pending').length;

  return (
    <section className="todo-panel" aria-label="Plano de tarefas">
      <div className="todo-header">
        <div className="todo-title-row">
          <ListChecks size={15} className="text-accent" />
          <span className="todo-title">Plano de Tarefas</span>
          <span className="todo-counter">
            {completed}/{todos.length} concluídas
          </span>
        </div>
        <button
          type="button"
          className="todo-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? 'Expandir' : 'Ocultar'}
          <ChevronDown size={13} className={collapsed ? 'rotate-90' : ''} />
        </button>
      </div>

      {!collapsed && (
        <ul className="todo-list" role="list">
          {todos.map((todo) => {
            const isCompleted = todo.status === 'completed';
            const isInProgress = todo.status === 'in_progress';
            return (
              <li key={todo.id} className={`todo-item todo-${todo.status}`}>
                <span className="todo-status-icon" aria-hidden="true">
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-success" />
                  ) : isInProgress ? (
                    <Clock size={13} className="text-accent spin-slow" />
                  ) : (
                    <Circle size={13} className="text-dim" />
                  )}
                </span>
                <span className="todo-task-text">{todo.task}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
