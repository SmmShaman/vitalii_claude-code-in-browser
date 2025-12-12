import type { EffectType, ParticleConfig } from '@/types/doodle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  rotation?: number;
  rotationSpeed?: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrame: number | null = null;
  private config: ParticleConfig;
  private effectType: EffectType;

  constructor(canvas: HTMLCanvasElement, effectType: EffectType, color: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.effectType = effectType;
    this.config = this.getConfigForEffect(effectType, color);

    this.resize();
    this.initParticles();
  }

  private getConfigForEffect(effect: EffectType, color: string): ParticleConfig {
    switch (effect) {
      case 'snow':
        return {
          count: 150,
          color: '#ffffff',
          size: { min: 2, max: 5 },
          speed: { min: 0.5, max: 2 },
          opacity: { min: 0.4, max: 0.9 },
        };

      case 'rain':
        return {
          count: 200,
          color: color || '#60A5FA',
          size: { min: 1, max: 3 },
          speed: { min: 5, max: 10 },
          opacity: { min: 0.3, max: 0.7 },
        };

      case 'stars':
        return {
          count: 100,
          color: '#ffffff',
          size: { min: 1, max: 3 },
          speed: { min: 0.1, max: 0.5 },
          opacity: { min: 0.3, max: 1 },
        };

      case 'sparkles':
        return {
          count: 80,
          color: color || '#FCD34D',
          size: { min: 2, max: 6 },
          speed: { min: 0.3, max: 1 },
          opacity: { min: 0.5, max: 1 },
        };

      case 'particles':
      default:
        return {
          count: 120,
          color: color || '#3B82F6',
          size: { min: 2, max: 4 },
          speed: { min: 0.5, max: 1.5 },
          opacity: { min: 0.4, max: 0.8 },
        };
    }
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(fromTop: boolean = false): Particle {
    const { size, speed, opacity } = this.config;

    return {
      x: Math.random() * this.canvas.width,
      y: fromTop ? -10 : Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * (speed.max - speed.min),
      vy: speed.min + Math.random() * (speed.max - speed.min),
      size: size.min + Math.random() * (size.max - size.min),
      opacity: opacity.min + Math.random() * (opacity.max - opacity.min),
      color: this.config.color,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
    };
  }

  private updateParticle(particle: Particle): void {
    switch (this.effectType) {
      case 'snow':
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx += Math.sin(particle.y * 0.01) * 0.01; // Drift
        break;

      case 'rain':
        particle.y += particle.vy;
        particle.x += particle.vx * 0.5;
        break;

      case 'stars':
        // Twinkling effect
        particle.opacity = 0.3 + Math.abs(Math.sin(Date.now() * 0.001 + particle.x)) * 0.7;
        break;

      case 'sparkles':
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation! += particle.rotationSpeed!;
        // Pulsing effect
        particle.size = this.config.size.min + Math.abs(Math.sin(Date.now() * 0.002 + particle.y)) * (this.config.size.max - this.config.size.min);
        break;

      case 'particles':
      default:
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation! += particle.rotationSpeed!;
        break;
    }

    // Wrap around screen
    if (particle.y > this.canvas.height + 10) {
      particle.y = -10;
      particle.x = Math.random() * this.canvas.width;
    }
    if (particle.x < -10) particle.x = this.canvas.width + 10;
    if (particle.x > this.canvas.width + 10) particle.x = -10;
  }

  private drawParticle(particle: Particle): void {
    this.ctx.save();
    this.ctx.globalAlpha = particle.opacity;
    this.ctx.fillStyle = particle.color;

    switch (this.effectType) {
      case 'snow':
        // Draw snowflake
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case 'rain':
        // Draw raindrop (line)
        this.ctx.beginPath();
        this.ctx.moveTo(particle.x, particle.y);
        this.ctx.lineTo(particle.x + particle.vx * 0.5, particle.y + particle.vy * 2);
        this.ctx.strokeStyle = particle.color;
        this.ctx.lineWidth = particle.size;
        this.ctx.stroke();
        break;

      case 'stars':
        // Draw twinkling star
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation!);
        this.drawStar(0, 0, 5, particle.size, particle.size * 0.5);
        break;

      case 'sparkles':
        // Draw sparkle
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation!);
        this.drawSparkle(0, 0, particle.size);
        break;

      case 'particles':
      default:
        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      this.ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      this.ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawSparkle(cx: number, cy: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size);
    this.ctx.lineTo(cx, cy + size);
    this.ctx.moveTo(cx - size, cy);
    this.ctx.lineTo(cx + size, cy);
    this.ctx.strokeStyle = this.config.color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);

    // Maintain canvas display size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  public animate(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const particle of this.particles) {
      this.updateParticle(particle);
      this.drawParticle(particle);
    }

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  public start(): void {
    if (!this.animationFrame) {
      this.animate();
    }
  }

  public stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  public destroy(): void {
    this.stop();
    this.particles = [];
  }
}
