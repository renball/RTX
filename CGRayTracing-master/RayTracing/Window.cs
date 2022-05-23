using OpenTK.Graphics.OpenGL4;
using OpenTK.Mathematics;
using OpenTK.Windowing.Common;
using OpenTK.Windowing.Desktop;
using OpenTK.Windowing.GraphicsLibraryFramework;
using System.IO;

namespace RayTracing
{
    public class Window : GameWindow
    {
        private ShaderProgram _shaderProgram;

        private float[] _vertices = {
            -1f, -1f, 0.0f, -1f, 1f, 0.0f, 1f, -1f, 0.0f, 1f, 1f, 0f
        };
        private int _vertexArrayObject;
        private int _vertexBufferObject;

        public Window(GameWindowSettings gameWindowSettings, NativeWindowSettings nativeWindowSettings)
            : base(gameWindowSettings, nativeWindowSettings) { }

        protected override void OnLoad()
        {
            base.OnLoad();

            //Сборка шейдерной программы (компиляция и линковка двух шейдеров)
            string vertexShaderText = File.ReadAllText("..\\..\\..\\Shaders\\raytracing.vert");
            string fragmentShaderText = File.ReadAllText("..\\..\\..\\Shaders\\raytracing.frag");
            
            _shaderProgram = new ShaderProgram(
                vertexShaderText, fragmentShaderText);

            //Создание Vertex Array Object и его привязка
            _vertexArrayObject = GL.GenVertexArray();
            GL.BindVertexArray(_vertexArrayObject);

            //Создание объекта буфера вершин/нормалей, его привязка и заполнение
            _vertexBufferObject = GL.GenBuffer();
            GL.BindBuffer(BufferTarget.ArrayBuffer, _vertexBufferObject);
            GL.BufferData(BufferTarget.ArrayBuffer, (sizeof(float) * _vertices.Length),
                _vertices, BufferUsageHint.StaticDraw);

            //Указание OpenGL, где искать вершины в буфере вершин/нормалей
            var posLoc = _shaderProgram.GetAttribLocation("vPosition");
            GL.EnableVertexAttribArray(posLoc);
            GL.VertexAttribPointer(posLoc, 3, VertexAttribPointerType.Float, false, 0, 0);

            //Установка фона
            GL.ClearColor(0.0f, 0.0f, 0.0f, 0.0f);
            //Включение теста глубины во избежание наложений
            GL.Enable(EnableCap.DepthTest);

            _shaderProgram.SetVector3("uCamera.Position", Camera.Position);
            _shaderProgram.SetVector3("uCamera.View", Camera.View);
            _shaderProgram.SetVector3("uCamera.Up", Camera.Up);
            _shaderProgram.SetVector3("uCamera.Side", Camera.Side);

            //Вычисления для сохранения пропорций
            Vector2 v = new Vector2(1.0f);
            if (Size.X >= Size.Y)
                v.X = Size.X / (float)Size.Y;
            else
                v.Y = Size.Y / (float)Size.X;
            //Где больше x или y у v, там возникает сжатие больше
            _shaderProgram.SetVector2("uCamera.Scale", v);
        }

        protected override void OnUnload()
        {
            //Отвязка всех ресурсов - установка в 0/null
            GL.BindVertexArray(0);
            GL.BindBuffer(BufferTarget.ArrayBuffer, 0);
            GL.UseProgram(0);
            //Очистка всех ресурсов
            GL.DeleteVertexArray(_vertexArrayObject);
            GL.DeleteBuffer(_vertexBufferObject);
        }

        protected override void OnRenderFrame(FrameEventArgs e)
        {
            base.OnRenderFrame(e);

            //Очистка буферов цвета и глубины
            GL.Clear(ClearBufferMask.ColorBufferBit | ClearBufferMask.DepthBufferBit);
            //Привязка буфера вершин
            GL.BindVertexArray(_vertexArrayObject);

            //Указание использовать данную шейдерную программу
            _shaderProgram.Use();

            Camera.RecalculateScale(Size.X, Size.Y);
            _shaderProgram.SetVector2("uCamera.Scale", Camera.Scale);

            GL.DrawArrays(PrimitiveType.TriangleStrip, 0, 4);
            SwapBuffers();
        }

        protected override void OnUpdateFrame(FrameEventArgs e)
        {
            base.OnUpdateFrame(e);
            if (!IsFocused)
                return;

            var input = KeyboardState;

            //Закрытие окна на Esc
            if (input.IsKeyDown(Keys.Escape))
                Close();
        }

        //Обновление размеров области видимости при изменении размеров окна
        protected override void OnResize(ResizeEventArgs e)
        {
            base.OnResize(e);
            GL.Viewport(0, 0, Size.X, Size.Y);
        }
    }
}