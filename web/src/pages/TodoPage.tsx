import { useState, useEffect, useCallback } from 'react';
import { Input, Button, List, Checkbox, Typography, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../api';
import type { Todo } from '../types';

const { Text } = Typography;

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTodos = useCallback(async () => {
    try {
      const data = await fetchTodos();
      setTodos(data);
    } catch {
      message.error('Failed to load todos');
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      await createTodo(newTitle.trim());
      setNewTitle('');
      await loadTodos();
    } catch {
      message.error('Failed to create todo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, { done: !todo.done });
      await loadTodos();
    } catch {
      message.error('Failed to update todo');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTodo(id);
      await loadTodos();
    } catch {
      message.error('Failed to delete todo');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>TODO Example</h2>

      <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
        <Input
          placeholder="Add a new todo..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onPressEnter={handleAdd}
          size="large"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          loading={loading}
          size="large"
        >
          Add
        </Button>
      </Space.Compact>

      <List
        dataSource={todos}
        locale={{ emptyText: 'No todos yet' }}
        renderItem={(todo) => (
          <List.Item
            actions={[
              <Popconfirm
                key="delete"
                title="Delete this todo?"
                onConfirm={() => handleDelete(todo.id)}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <Checkbox checked={todo.done} onChange={() => handleToggle(todo)}>
              <Text delete={todo.done} type={todo.done ? 'secondary' : undefined}>
                {todo.title}
              </Text>
            </Checkbox>
          </List.Item>
        )}
      />
    </div>
  );
}
