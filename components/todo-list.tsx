import { getTodos } from "@/lib/actions/todos";
import { TodoItem } from "./todo-item";

export async function TodoList() {
  const todos = await getTodos();

  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No todos yet. Add one above to get started!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}