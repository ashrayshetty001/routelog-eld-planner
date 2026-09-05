import truckHeroLight from '../assets/truck-hero-light.png'
import truckHeroDark from '../assets/truck-hero-dark.png'

export default function HeroIllustration() {
  return (
    <div className="relative w-full h-full min-h-[560px] overflow-hidden rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-900">
      <img
        src={truckHeroLight}
        alt="RouteLog Semi-Truck on Mountain Highway"
        className="w-full h-full object-cover block dark:hidden"
      />
      <img
        src={truckHeroDark}
        alt="RouteLog Semi-Truck on Night Mountain Highway"
        className="w-full h-full object-cover hidden dark:block"
      />
    </div>
  )
}
