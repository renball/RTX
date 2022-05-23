using OpenTK.Mathematics;

namespace RayTracing
{
    public static class Camera
    {
        public static Vector3 Position = new Vector3(0.0f, 0.0f, -7f);
        public static Vector3 View = new Vector3(0.0f, 0.0f, 1.0f);
        public static Vector3 Up = new Vector3(0.0f, 1.0f, 0.0f);
        public static Vector3 Side = new Vector3(1.0f, 0.0f, 0.0f);
        public static Vector2 Scale = new Vector2(1.0f);

        public static void RecalculateScale(int WindowWidth, int WindowHeight)
        {
            Scale = new Vector2(1.0f);

            if (WindowWidth > WindowHeight)
                Scale.X = WindowWidth / (float)WindowHeight;
            else if(WindowWidth < WindowHeight)
                Scale.Y = WindowHeight / (float)WindowWidth;
        }
    }
}
