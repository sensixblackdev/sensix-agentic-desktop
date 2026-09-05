import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, ChevronDown, ListChecks } from 'lucide-react';

export function TodoList({ todos = [] }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!todos || todos.length === 0) return null;

  const validTodos = todos.filter((t) => t && typeof t === 'object');
  const completed = validTodos.filter((t) => t.status === 'completed').length;
  const inProgress = validTodos.filter((t) => t.status === 'in_progress').length;
  const pending = validTodos.filter((t) => t.status === 'pending').length;

  return (
    <section className="todo-panel" aria-label="Plano de tarefas">
      <div className="todo-header">
        <div className="todo-title-row">
          <ListChecks size={15} className="text-accent" />
          <span className="todo-title">Plano de Tarefas</span>
          <span className="todo-counter">
            {completed}/{validTodos.length} concluídas
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
          {validTodos.map((todo, idx) => {
            const isCompleted = todo.status === 'completed';
            const isInProgress = todo.status === 'in_progress';
            return (
              <li key={todo.id || idx} className={`todo-item todo-${todo.status || 'pending'}`}>
                <span className="todo-status-icon" aria-hidden="true">
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-success" />
                  ) : isInProgress ? (
                    <Clock size={13} className="text-accent spin-slow" />
                  ) : (
                    <Circle size={13} className="text-dim" />
                  )}
                </span>
                <span className="todo-task-text">{todo.task || '(Tarefa sem descrição)'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
