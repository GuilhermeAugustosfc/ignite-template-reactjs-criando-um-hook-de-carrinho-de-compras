import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const getLocalStorageCart = (): Product[] | [] => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (!storagedCart) {
      const initialData = [
        {
          id: 1,
          amount: 2,
          image:
            "https://rocketseat-cdn.s3-sa-east-1.amazonaws.com/modulo-redux/tenis1.jpg",
          price: 179.9,
          title: "Tênis de Caminhada Leve Confortável",
        },
        {
          id: 2,
          amount: 1,
          image:
            "https://rocketseat-cdn.s3-sa-east-1.amazonaws.com/modulo-redux/tenis2.jpg",
          price: 139.9,
          title: "Tênis VR Caminhada Confortável Detalhes Couro Masculino",
        },
      ];
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(initialData));

      return initialData;
    }

    return JSON.parse(storagedCart);
  };

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = getLocalStorageCart();
    return storagedCart;
  });

  const addLocalStorageCart = (product: Product) => {
    const storagedCart = getLocalStorageCart();
    const data = [...storagedCart, product];
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(data));
  };

  const updateLocalStorageCart = (newProduct: Product, productId: number) => {
    const storagedCart = getLocalStorageCart();
    const index = getindexInArray(storagedCart, productId);
    storagedCart[index] = newProduct;
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(storagedCart));
  };

  const getindexInArray = (array: Product[], productId: number) => {
    return cart.findIndex((item) => item.id === productId);
  };

  const getCartState = (productId: number): Product => {
    const filter = cart.filter((item) => item.id === productId);

    if (filter.length) {
      const cartFiltered = filter[0];
      return cartFiltered;
    }
    return {} as Product;
  };

  const getCartApi = async (productId: number): Promise<Product> => {
    const { data: product } = await api.get<Omit<Product, "amount">>(
      `products/${productId}`
    );
    const newCart: Product = { ...product, amount: 1 };
    return newCart;
  };

  const validStock = async (
    productId: number,
    amoundSelected: number
  ): Promise<boolean> => {
    const { data: stock } = await api.get<Stock>(`stock/${productId}`);

    return amoundSelected <= stock.amount;
  };

  const updateExistingCart = (cartState: Product, productId: number) => {
    updateLocalStorageCart(cartState, productId);
    const index = getindexInArray(cart, productId);
    const copyCart = [...cart];
    copyCart[index] = cartState;
    setCart(copyCart);
  };

  const addProduct = async (productId: number) => {
    try {
      // TODO
      const cartState = getCartState(productId);
      if (Object.keys(cartState).length) {
        const valid = await validStock(cartState.id, cartState.amount + 1);
        if (!valid) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        cartState.amount++;
        updateExistingCart(cartState, productId);
        return;
      }

      const newCart = await getCartApi(productId);
      const valid = await validStock(newCart.id, newCart.amount);
      if (!valid) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      addLocalStorageCart(newCart);
      setCart((state) => [...state, newCart]);
    } catch {
      // TODO
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // TODO
      const copyCart = [...cart];
      const index = getindexInArray(copyCart, productId);
      if (index === -1) {
        toast.error("Erro na remoção do produto");
        return;
      }

      copyCart.splice(index, 1);

      setCart(copyCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(copyCart));
    } catch {
      // TODO
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // TODO
      if (amount <= 0) return;

      const copyCart = [...cart];
      const index = getindexInArray(copyCart, productId);
      const valid = await validStock(copyCart[index].id, amount);
      if (!valid) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      copyCart[index].amount = amount;

      updateLocalStorageCart(copyCart[index], productId);
      setCart(copyCart);
    } catch {
      // TODO
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
