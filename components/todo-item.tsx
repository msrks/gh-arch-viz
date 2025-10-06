"use client";

import { useState } from "react";
import { updateTodo, deleteTodo } from "@/lib/actions/todos";
import { Button } from "@/components/ui/button";

interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function TodoItem({ todo }: { todo: Todo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description);

  const handleToggle = async () => {
    await updateTodo(todo.id, { completed: !todo.completed });
  };

  const handleSave = async () => {
    await updateTodo(todo.id, { title, description });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this todo?")) {
      await deleteTodo(todo.id);
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${todo.completed ? "bg-gray-50" : "bg-white"}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={handleToggle}
            className="mt-1"
          />
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2 py-1 border rounded"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2 py-1 border rounded"
                  rows={2}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSave}
                    variant="default"
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className={`font-medium ${todo.completed ? "line-through text-gray-500" : ""}`}>
                  {todo.title}
                </h3>
                {todo.description && (
                  <p className={`text-sm mt-1 ${todo.completed ? "line-through text-gray-400" : "text-gray-600"}`}>
                    {todo.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Created: {new Date(todo.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
        {!isEditing && (
          <div className="flex space-x-2 ml-4">
            <Button
              onClick={() => setIsEditing(true)}
              variant="default"
              size="sm"
            >
              Edit
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}