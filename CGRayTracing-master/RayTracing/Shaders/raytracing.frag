#version 430

in vec3 glPosition;
out vec4 FragColor;

const float BIG = 1000000.0;
const float EPSILON = 0.001;

const int DIFFUSE = 1;
const int REFLECTION = 2;
const int REFRACTION = 3;

const int DIFFUSE_REFLECTION = 1;
const int MIRROR_REFLECTION = 2;

const vec3 Unit = vec3(1.0, 1.0, 1.0);


/*** DATA STRUCTURES ***/

// Sphere description
struct SSphere
{
    vec3 Center;
    float Radius;
    int MaterialIdx;
};

// Triangle description
struct STriangle
{
    vec3 v1;
    vec3 v2;
    vec3 v3;
    int MaterialIdx;
};

// Camera settings description
struct SCamera
{
    vec3 Position;
    vec3 View;
    vec3 Up;
    vec3 Side;
    vec2 Scale;
};

// One ray description
struct SRay
{
    vec3 Origin;
    vec3 Direction;
};

struct SIntersection
{
    float Time;
    vec3 Point;
    vec3 Normal;
    vec3 Color;
    
    // Ambient, diffuse and specular coeffs
    vec4 LightCoeffs;

    // 0 - non-reflection, 1 - mirror
    float ReflectionCoef;
    float RefractionCoef;
    int MaterialType;
};

// Point light position
struct SLight
{
    vec3 Position;
};

struct SMaterial
{
    // Diffuse color
    vec3 Color;

    // Ambient, diffuse and specular coeffs
    vec4 LightCoeffs;

    // 0 - non-reflection, 1 - mirror
    float ReflectionCoef;
    float RefractionCoef;
    int MaterialType;
};

// TracingRay: structure for mirror objects (they can re-reflect rays)
// Ray is our ray, depth is a number of re-reflection,
// contribution is a light's contribution to the result color
struct STracingRay
{
    SRay ray;
    float contribution;
    int depth;
};

// Camera (as uniform)
uniform SCamera uCamera;

// Scene objects and their materials
STriangle triangles[24];
SSphere spheres[4];
SMaterial materials[10];

// Scene's light source position
SLight light;

void initializeDefaultScene(out STriangle triangles[24], out SSphere spheres[4])
{
    // Left wall . . . . . . . . . . . . . . . .
    triangles[0].v1 = vec3(-5.0, -5.0, -5.0);
    triangles[0].v2 = vec3(-5.0, 5.0, 5.0);
    triangles[0].v3 = vec3(-5.0, 5.0,-5.0);
    triangles[0].MaterialIdx = 2;

    triangles[1].v1 = vec3(-5.0, -5.0,-5.0);
    triangles[1].v2 = vec3(-5.0, -5.0, 5.0);
    triangles[1].v3 = vec3(-5.0, 5.0, 5.0);
    triangles[1].MaterialIdx = 2;
    
    // Front wall . . . . . . . . . . . . . . .
    triangles[2].v1 = vec3(-5.0, -5.0, 5.0);
    triangles[2].v2 = vec3( 5.0, -5.0, 5.0);
    triangles[2].v3 = vec3(-5.0, 5.0, 5.0);
    triangles[2].MaterialIdx = 1;
    
    triangles[3].v1 = vec3(5.0, 5.0, 5.0);
    triangles[3].v2 = vec3(-5.0, 5.0, 5.0);
    triangles[3].v3 = vec3(5.0, -5.0, 5.0);
    triangles[3].MaterialIdx = 1;
    
    // Right wall . . . . . . . . . . . . . . . .
    triangles[4].v1 = vec3(5.0, -5.0, -5.0);
    triangles[4].v2 = vec3(5.0, 5.0, -5.0);
    triangles[4].v3 = vec3(5.0, 5.0, 5.0);
    triangles[4].MaterialIdx = 2;

    triangles[5].v1 = vec3(5.0, 5.0, 5.0);
    triangles[5].v2 = vec3(5.0, -5.0, 5.0);
    triangles[5].v3 = vec3(5.0,-5.0, -5.0);
    triangles[5].MaterialIdx = 2;

    // Back wall . . . . . . . . . . . . . . . .
    triangles[6].v1 = vec3(-20.0, -20.0, -8.0);
    triangles[6].v2 = vec3(-20.0, 20.0, -8.0);
    triangles[6].v3 = vec3(20.0, -20.0, -8.0);
    triangles[6].MaterialIdx = 1;

    triangles[7].v1 = vec3(-20.0, 20.0, -8.0);
    triangles[7].v2 = vec3(20.0, 20.0, -8.0);
    triangles[7].v3 = vec3(20.0, -20.0, -8.0);
    triangles[7].MaterialIdx = 1;

    // Ceiling . . . . . . . . . . . . . . . . .
    triangles[8].v1 = vec3(5.0, 5.0, -5.0);
    triangles[8].v2 = vec3(-5.0, 5.0, -5.0);
    triangles[8].v3 = vec3(-5.0, 5.0, 5.0);
    triangles[8].MaterialIdx = 3;

    triangles[9].v1 = vec3(-5.0, 5.0, 5.0);
    triangles[9].v2 = vec3(5.0, 5.0, 5.0);
    triangles[9].v3 = vec3(5.0, 5.0, -5.0);
    triangles[9].MaterialIdx = 3;
    
    // Floor . . . . . . . . . . . . . . . . . .
    triangles[10].v1 = vec3(-5.0, -5.0, 5.0);
    triangles[10].v2 = vec3(-5.0, -5.0, -5.0);
    triangles[10].v3 = vec3(5.0, -5.0, -5.0);
    triangles[10].MaterialIdx = 3;

    triangles[11].v1 = vec3(5.0, -5.0, -5.0);
    triangles[11].v2 = vec3(5.0, -5.0, 5.0);
    triangles[11].v3 = vec3(-5.0, -5.0, 5.0);
    triangles[11].MaterialIdx = 3;
    
    //Cube

    // Left wall . . . . . . . . . . . . . . . .
    triangles[12].v1 = vec3(-1.0, -1.0, -1.0);
    triangles[12].v2 = vec3(-1.0, 1.0, 1.0);
    triangles[12].v3 = vec3(-1.0, 1.0,-1.0);
    triangles[12].MaterialIdx = 0;

    triangles[13].v1 = vec3(-1.0, -1.0,-1.0);
    triangles[13].v2 = vec3(-1.0, -1.0, 1.0);
    triangles[13].v3 = vec3(-1.0, 1.0, 1.0);
    triangles[13].MaterialIdx = 0;
    
    // Front wall . . . . . . . . . . . . . . .
    triangles[14].v1 = vec3(-1.0, -1.0, 1.0);
    triangles[14].v2 = vec3( 1.0, -1.0, 1.0);
    triangles[14].v3 = vec3(-1.0, 1.0, 1.0);
    triangles[14].MaterialIdx = 1;
    
    triangles[15].v1 = vec3(1.0, 1.0, 1.0);
    triangles[15].v2 = vec3(-1.0, 1.0, 1.0);
    triangles[15].v3 = vec3(1.0, -1.0, 1.0);
    triangles[15].MaterialIdx = 1;
    
    // Right wall . . . . . . . . . . . . . . . .
    triangles[16].v1 = vec3(1.0, -1.0, -1.0);
    triangles[16].v2 = vec3(1.0, 1.0, -1.0);
    triangles[16].v3 = vec3(1.0, 1.0, 1.0);
    triangles[16].MaterialIdx = 2;

    triangles[17].v1 = vec3(1.0, 1.0, 1.0);
    triangles[17].v2 = vec3(1.0, -1.0, 1.0);
    triangles[17].v3 = vec3(1.0,-1.0, -1.0);
    triangles[17].MaterialIdx = 2;

    // Back wall . . . . . . . . . . . . . . . .
    triangles[18].v1 = vec3(-1.0, -1.0, -1.0);
    triangles[18].v2 = vec3(-1.0, 1.0, -1.0);
    triangles[18].v3 = vec3(1.0, -1.0, -1.0);
    triangles[18].MaterialIdx = 2;

    triangles[19].v1 = vec3(-1.0, 1.0, -1.0);
    triangles[19].v2 = vec3(1.0, 1.0, -1.0);
    triangles[19].v3 = vec3(1.0, -1.0, -1.0);
    triangles[19].MaterialIdx = 2;

    // Ceiling . . . . . . . . . . . . . . . . .
    triangles[20].v1 = vec3(1.0, 1.0, -1.0);
    triangles[20].v2 = vec3(-1.0, 1.0, -1.0);
    triangles[20].v3 = vec3(-1.0, 1.0, 1.0);
    triangles[20].MaterialIdx = 4;

    triangles[21].v1 = vec3(-1.0, 1.0, 1.0);
    triangles[21].v2 = vec3(1.0, 1.0, 1.0);
    triangles[21].v3 = vec3(1.0, 1.0, -1.0);
    triangles[21].MaterialIdx = 4;
    
    // Floor . . . . . . . . . . . . . . . . . .
    triangles[22].v1 = vec3(-1.0, -1.0, 1.0);
    triangles[22].v2 = vec3(-1.0, -1.0, -1.0);
    triangles[22].v3 = vec3(1.0, -1.0, -1.0);
    triangles[22].MaterialIdx = 5;

    triangles[23].v1 = vec3(1.0, -1.0, -1.0);
    triangles[23].v2 = vec3(1.0, -1.0, 1.0);
    triangles[23].v3 = vec3(-1.0, -1.0, 1.0);
    triangles[23].MaterialIdx = 5;


    //Spheres . . . . . . . . . . . . . . . . .
    spheres[0].Center = vec3(-1.5, 1.5, 1.0);
    spheres[0].Radius = 1.0;
    spheres[0].MaterialIdx = 6;
    
    spheres[3].Center = vec3(1.5, -1.5, 1.0);
    spheres[3].Radius = 1.0;
    spheres[3].MaterialIdx = 6;

    spheres[1].Center = vec3(-1.0, -1.5, -3.0);
    spheres[1].Radius = 1.0;
    spheres[1].MaterialIdx = 4;

    spheres[2].Center = vec3(1.0, 1.5, -3.0);
    spheres[2].Radius = 1.0;
    spheres[2].MaterialIdx = 5;
}

void initializeDefaultLightMaterials(out SLight light, out SMaterial materials[10])
{
    //** LIGHT **//
    light.Position = vec3(2.0, 0.0, -5.0f);
	
    // Phong's light ambient, diffuse and specular multipliers
    vec4 lightCoefs = vec4(0.95, 0.98, 0.4, 512.0);

    /** MATERIALS **/
    // Left wall material (orange) 0
    materials[0].Color = vec3(0.81, 0.25, 0.13);
    materials[0].LightCoeffs = vec4(lightCoefs);
    materials[0].ReflectionCoef = 0.07;
    materials[0].RefractionCoef = 1;
    materials[0].MaterialType = REFLECTION;

    // Front wall material (blue) 1
    materials[1].Color = vec3(0.2, 0.3, 0.7);
    materials[1].LightCoeffs = vec4(lightCoefs);
    materials[1].ReflectionCoef = 0.2;
    materials[1].RefractionCoef = 1;
    materials[1].MaterialType = REFLECTION;

    // Right wall material (white) 2
    materials[2].Color = vec3(0.65, 0.65, 0.65);
    materials[2].LightCoeffs = vec4(lightCoefs);
    materials[2].ReflectionCoef = 0.4;
    materials[2].RefractionCoef = 1;
    materials[2].MaterialType = REFLECTION;

    // Back wall material (purple) 3
    materials[3].Color = vec3(0.7, 0.3, 0.9);
	materials[3].LightCoeffs = vec4(lightCoefs);
	materials[3].ReflectionCoef = 0;
	materials[3].RefractionCoef = 1;
	materials[3].MaterialType = DIFFUSE;

    // Ceiling material (turquoise) 4
    materials[4].Color = vec3(0.31, 0.61, 0.71);
    materials[4].LightCoeffs = vec4(lightCoefs);
    materials[4].ReflectionCoef = 0;
    materials[4].RefractionCoef = 1;
    materials[4].MaterialType = DIFFUSE;
    
    // Floor material (green) 5
    materials[5].Color = vec3 (0.3, 0.6, 0.3);
	materials[5].LightCoeffs = vec4(lightCoefs);
	materials[5].ReflectionCoef = 0;
	materials[5].RefractionCoef = 1;
	materials[5].MaterialType = DIFFUSE;

    // Spheres material (mirror) 6
    materials[6].Color = vec3(0.1, 0.1, 0.1);
    materials[6].LightCoeffs = vec4(lightCoefs);
    materials[6].ReflectionCoef = 0.8;
    materials[6].RefractionCoef = 1;
    materials[6].MaterialType = REFLECTION;

    ///Test material
    //materials[7].Color = vec3(0.81, 0.25, 0.13);
    materials[7].LightCoeffs = vec4(lightCoefs);
    materials[7].ReflectionCoef = 0;
    materials[7].RefractionCoef = 0.9;
    materials[7].MaterialType = REFRACTION;
}

SRay GenerateRay(SCamera uCamera)
{
    vec2 coords = glPosition.xy * uCamera.Scale;
    vec3 direction = uCamera.View + uCamera.Side * coords.x
                + uCamera.Up * coords.y;
    return SRay(uCamera.Position, normalize(direction));
}

// Tells us if the sphere was intersected by our ray
bool IntersectSphere(SSphere sphere, SRay ray, float start, float final, out float time)
{
    ray.Origin -= sphere.Center;
    float A = dot(ray.Direction, ray.Direction);
    float B = dot(ray.Direction, ray.Origin);
    float C = dot(ray.Origin, ray.Origin) - sphere.Radius * sphere.Radius; float D = B * B - A * C;
    if (D > 0.0)
    {
        D = sqrt(D);
        float t1 = (-B - D) / A;
        float t2 = (-B + D) / A;
        if(t1 < 0 && t2 < 0)
            return false;
        if(min(t1, t2) < 0)
        {
            time = max(t1,t2);
            return true;
        }
        time = min(t1, t2);
        return true;
    }
    return false;
}

// Tells us if the triangle was intersected by our ray
bool IntersectTriangle(SRay ray, STriangle triangle, out float time)
{
    /// Compute the intersection of ray with a triangle using geometric solution
    // Input: points v0, v1, v2 are the triangle's vertices
    // rayOrig and rayDir are the ray's origin (point) and the ray's direction
    // Return: return true is the ray intersects the triangle, false otherwise
    // compute plane's normal vector

    vec3 v1 = triangle.v1;
    vec3 v2 = triangle.v2;
    vec3 v3 = triangle.v3;
    time = -1;
    vec3 A = v2 - v1;
    vec3 B = v3 - v1;
    // no need to normalize vector
    vec3 N = cross(A, B);
    // N
    // Step 1: finding P
    // check if ray and plane are parallel ?
    float NdotRayDirection = dot(N, ray.Direction);
    if ((NdotRayDirection > -EPSILON) && (NdotRayDirection < EPSILON))
        return false;
    // they are parallel so they don't intersect !
    // compute d parameter using equation 2
    float d = dot(N, v1);
    // compute t (equation 3)
    float t = -(dot(N, ray.Origin) - d) / NdotRayDirection;
    // check if the triangle is in behind the ray
    if (t < 0)
        return false;
    // the triangle is behind
    // compute the intersection point using equation 1
    vec3 P = ray.Origin + t * ray.Direction;
    // // Step 2: inside-outside test //
    vec3 C;
    // vector perpendicular to triangle's plane
    // edge 0
    vec3 edge1 = v2 - v1;
    vec3 VP1 = P - v1;
    C = cross(edge1, VP1);
    if (dot(N, C) < 0)
        return false;
    // P is on the right side
    // edge 1
    vec3 edge2 = v3 - v2;
    vec3 VP2 = P - v2;
    C = cross(edge2, VP2);
    if (dot(N, C) < 0)
        return false;
    // P is on the right side
    // edge 2
    vec3 edge3 = v1 - v3;
    vec3 VP3 = P - v3;
    C = cross(edge3, VP3);
    if (dot(N, C) < 0)
        return false;
    // P is on the right side;
    time = t;
    return true;
    // this ray hits the triangle
}

// Intersects our ray with all the scene's primitives and returns (via inout) the nearest intersection
bool Raytrace(SRay ray, SSphere spheres[4], STriangle triangles[24], SMaterial materials[10],
              float start, float final, inout SIntersection intersect)
{
    bool result = false;
    float test = start;
    intersect.Time = final;

    // Calculate intersect with spheres
    for(int i = 0; i < 4; i++)
    {
        SSphere sphere = spheres[i];
        if(IntersectSphere(sphere, ray, start, final, test) && test < intersect.Time)
        {
            intersect.Time = test;
            intersect.Point = ray.Origin + ray.Direction * test;
            intersect.Normal = normalize(intersect.Point - spheres[i].Center);
            intersect.Color = materials[sphere.MaterialIdx].Color;
            intersect.LightCoeffs = materials[sphere.MaterialIdx].LightCoeffs;
            intersect.ReflectionCoef = materials[sphere.MaterialIdx].ReflectionCoef;
            intersect.RefractionCoef = materials[sphere.MaterialIdx].RefractionCoef;
            intersect.MaterialType = materials[sphere.MaterialIdx].MaterialType;
            result = true;
        }
    }

    //calculate intersect with triangles
    for(int i = 0; i < 24; i++)
    {
        STriangle triangle = triangles[i];
        if(IntersectTriangle(ray, triangle, test) && test < intersect.Time)
        {
            intersect.Time = test;
            intersect.Point = ray.Origin + ray.Direction * test;
            intersect.Normal = normalize(cross(triangle.v1 - triangle.v2, triangle.v3 - triangle.v2));
            intersect.Color = materials[triangle.MaterialIdx].Color;
            intersect.LightCoeffs = materials[triangle.MaterialIdx].LightCoeffs;
            intersect.ReflectionCoef = materials[triangle.MaterialIdx].ReflectionCoef;
            intersect.RefractionCoef = materials[triangle.MaterialIdx].RefractionCoef;
            intersect.MaterialType = materials[triangle.MaterialIdx].MaterialType;
            result = true;
        }
    }
    return result;
}

vec3 Phong(SIntersection intersect, SLight currLight, float shadow)
{
    vec3 light = normalize(currLight.Position - intersect.Point);
    float diffuse = max(dot(light, intersect.Normal), 0.0);
    vec3 view = normalize(uCamera.Position - intersect.Point);
    vec3 reflected = reflect(-view, intersect.Normal);
    float specular = pow(max(dot(reflected, light), 0.0), intersect.LightCoeffs.w);
    return intersect.LightCoeffs.x * intersect.Color +
        intersect.LightCoeffs.y * diffuse * intersect.Color * shadow +
        intersect.LightCoeffs.z * specular * Unit;
}

float Shadow(SLight currLight, SIntersection intersect)
{
    // Point is lighted
    float shadowing = 1.0;
    // Vector to the light source
    vec3 direction = normalize(currLight.Position - intersect.Point);
    // Distance to the light source
    float distanceLight = distance(currLight.Position, intersect.Point);
    // Generating shadow ray for this light source
    SRay shadowRay = SRay(intersect.Point + direction * EPSILON, direction);
    
    // ...test intersection this ray with each scene object
    SIntersection shadowIntersect;
    shadowIntersect.Time = BIG;
    
    if (Raytrace(shadowRay, spheres, triangles, materials, 0, distanceLight, shadowIntersect))
    {
        // this light source is invisible in the intercection point
        shadowing = 0.0;
    }
    return shadowing;
}

const int MAX_STACK_SIZE = 10;
const int MAX_TRACE_DEPTH = 8;
STracingRay stack[MAX_STACK_SIZE];
int stackSize = 0;

bool pushRay(STracingRay secondaryRay)
{
    if(stackSize < MAX_STACK_SIZE - 1 && secondaryRay.depth < MAX_TRACE_DEPTH)
    {
        stack[stackSize] = secondaryRay;
        stackSize++;
        return true;
    }
    return false;
}

bool isEmpty()
{
    return (stackSize < 0);
}

STracingRay popRay()
{
    stackSize--;
    return stack[stackSize];
}


void main(void)
{
    vec3 resultColor = vec3(0,0,0);

    float start = 0;
    float final = 1000000.0;

    // Initializing scene objects, light position and materials
    initializeDefaultScene(triangles, spheres);
    initializeDefaultLightMaterials(light, materials);

    // Defining initial ray - from the camera
    SRay ray = GenerateRay(uCamera);
    
    SIntersection intersect;
    intersect.Time = 1000000.0;
    
    STracingRay trRay = STracingRay(ray, 1, 0);
    pushRay(trRay);

    while(!isEmpty())
    {
        STracingRay trRay = popRay();
        ray = trRay.ray;
        SIntersection intersect;
        intersect.Time = BIG;
        start = 0;
        final = BIG;

        if (Raytrace(ray, spheres, triangles, materials, start, final, intersect))
        {
            switch(intersect.MaterialType)
            {
                case DIFFUSE_REFLECTION:
                {
                    float shadowing = Shadow(light, intersect);
                    resultColor += trRay.contribution * Phong(intersect, light, shadowing);
                    break;
                }

                case MIRROR_REFLECTION:
                {
                    if(intersect.ReflectionCoef < 1)
                    {
                        float contribution = trRay.contribution * (1 - intersect.ReflectionCoef);
                        float shadowing = Shadow(light, intersect);
                        resultColor += contribution * Phong(intersect, light, shadowing);
                    }
                    vec3 reflectDirection = reflect(ray.Direction, intersect.Normal); // create reflection ray
                    float contribution = trRay.contribution * intersect.ReflectionCoef;
                    STracingRay reflectRay = STracingRay(SRay(intersect.Point + reflectDirection * EPSILON, reflectDirection),
                                                         contribution, trRay.depth + 1);
                    pushRay(reflectRay);
                    break;
                }

                case REFRACTION:
                {
                    float ior;
                    int sign;
                    if (dot(ray.Direction, intersect.Normal) < 0)
                    {
                        ior = 1.0 / intersect.RefractionCoef;
                        sign = 1;
                    }
                    else
                    {
                        ior = intersect.RefractionCoef;
                        sign = -1;
                    }
                    vec3 refractionDirection = normalize(refract(ray.Direction, intersect.Normal * sign, ior));
                    STracingRay refractRay = STracingRay(SRay(intersect.Point + EPSILON * refractionDirection, refractionDirection), trRay.contribution, trRay.depth + 1);
                    pushRay(refractRay);
                    break;
                }
            }
        }
    }
    FragColor = vec4 (resultColor, 1.0);
}