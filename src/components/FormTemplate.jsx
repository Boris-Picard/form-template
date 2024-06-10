import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Progress } from "./ui/progress"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useNavigate, useParams } from "react-router-dom"

import axios from "axios"
import Error from "./ui/error"

export default function FormTemplate() {

    const [steps, setSteps] = useState(1)
    const [dataStep, setDataStep] = useState([])
    const [coinId, setCoinId] = useState(null)
    const [error, setError] = useState(null)
    const [transaction, setTransaction] = useState([])
    const [selectData, setSelectData] = useState([])



    const navigate = useNavigate()
    const { id, name } = useParams()

    useEffect(() => {
        const fetchTransaction = async () => {
            if (id) {
                try {
                    const response = await axios.get(`http://localhost:3001/api/transaction/id/${id}`);
                    setTransaction(response.data.transaction);
                    setCoinId(response.data.transaction.coin._id)
                } catch (error) {
                    console.error("Error fetching transaction", error);
                }
            } else if (name) {
                try {
                    const response = await axios.get(`http://localhost:3001/api/transaction/name/${name}`);
                    setTransaction(response.data.coin[0]);
                    setCoinId(response.data.coin[0]._id)
                    setDataStep({ step1: { coin: response.data.coin[0]._id } })
                    setSteps(2)
                } catch (error) {
                    console.error("Error fetching transaction", error);
                }
            }
        };
        fetchTransaction();
    }, [id, name]);

    useEffect(() => {
        const fetchList = async () => {
            try {
                const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc?x_cg_demo_api_key=CG-1t8kdBZJMA1YUmpjF5nypF6R")
                setSelectData(response.data)
            } catch (error) {
                console.log("Error fetching CoinGecko list :", error)
            }
        }
        fetchList()
    }, [])

    // Validation schema for the first form step
    const FormSchemaFirstStep = z.object({
        coin: z
            .string({
                required_error: "Please select a valid coin.",
            }).min(1, {
                message: "Please select a coin"
            }),
    });

    // Validation schema for the second form step
    const FormSchemaSecondStep = z.object({
        quantity: z.coerce.number({
            message: "Please enter a number"
        }).min(0.0000000001, { message: "Please enter at least one number" }),
        price: z.coerce.number({
            message: "Please enter a number"
        }).min(0.0000000001, { message: "Please enter at least one number" }),
        spent: z.coerce.number({
            message: "Please enter a number"
        }).min(0.0000000001, { message: "Please enter at least one number" }),
        date: z.date().refine(date => date <= new Date(), "Please enter a valid date")
    });

    // Hook form instance for the first step with validation resolver
    const firstForm = useForm({
        resolver: zodResolver(FormSchemaFirstStep),
        defaultValues: {
            coin: "",
        }
    });

    useEffect(() => {
        try {
            if (id) {
                firstForm.setValue('coin', transaction.coin.name);
            }
            if (name) {
                firstForm.setValue('coin', transaction.name)
            }
        } catch (error) {
            console.log(error);
        }

    }, [transaction, firstForm, name, id]);

    // Hook form instance for the second step with validation resolver
    const secondForm = useForm({
        resolver: zodResolver(FormSchemaSecondStep),
        defaultValues: {
            quantity: 0,
            price: 0,
            spent: 0,
            date: new Date(),
        }
    });

    useEffect(() => {
        if (id) {
            secondForm.setValue('quantity', transaction.quantity);
            secondForm.setValue('price', transaction.price);
            secondForm.setValue('spent', transaction.spent);
            secondForm.setValue('date', new Date(transaction.date));
        }
        if (name) {
            secondForm.setValue('date', new Date());
        }
    }, [transaction, secondForm, name, id]);

    // Handle submission for the first step
    const handleFirstStepSubmit = async (data) => {
        console.log(data);
        try {
            // Validate the data according to the schema
            const parsedData = FormSchemaFirstStep.parse(data);
            // Store the parsed data
            setDataStep((prev) => ({ ...prev, step1: parsedData }));
            let response;
            if (id && transaction && transaction.coin.name) {
                response = await axios.put(`http://localhost:3001/api/coin/${transaction.coin._id}`, {
                    name: parsedData.coin
                })
            } else {
                response = await axios.post("http://localhost:3001/api/coin", {
                    name: parsedData.coin,
                })
            }
            setCoinId(response.data._id)
            // Proceed to the next step
            setSteps(2);
        } catch (error) {
            setError(error.response.data.error)
            console.log("Form data is invalid", error.message);
        }
    };

    // Handle submission for the second step
    const handleSecondStepSubmit = async (data) => {
        console.log(data);
        try {
            const parsedData = FormSchemaSecondStep.parse(data);
            setDataStep((prev) => ({ ...prev, step2: parsedData }));
            setSteps(3);
            if (id) {
                await axios.put(`http://localhost:3001/api/transaction/id/${transaction._id}`, {
                    quantity: parsedData.quantity,
                    price: parsedData.price,
                    spent: parsedData.spent,
                    date: parsedData.date,
                })
            } else if (name) {
                await axios.post(`http://localhost:3001/api/transaction/name/${transaction.name}`, {
                    quantity: parsedData.quantity,
                    price: parsedData.price,
                    spent: parsedData.spent,
                    date: parsedData.date,
                    coinId: coinId,
                })
            } else {
                await axios.post("http://localhost:3001/api/coin/transaction", {
                    coinId: coinId,
                    transactionData: {
                        quantity: parsedData.quantity,
                        price: parsedData.price,
                        spent: parsedData.spent,
                        date: parsedData.date,
                    },
                });
            }
            setTimeout(() => {
                navigate('/seecoins');
            }, 4000);
        } catch (error) {
            setError(error.response.data.error)
            console.log("Form data is invalid", error.message);
        }
    };
    console.log(dataStep);
    return (
        <div className="flex h-full items-center justify-center">
            <div className="flex w-full md:w-1/2 flex-col justify-center items-center shadow-lg p-6 rounded-md bg-slate-200">
                <div className="flex flex-col space-y-3 items-center">
                    <h1 className="font-bold text-5xl">
                        Welcome.
                    </h1>
                    <h2 className="font-bold text-3xl">
                        Add a coin
                    </h2>
                </div>
                <div className="my-5 w-full">
                    <Progress value={steps === 1 && id ? 0 : steps === 2 || name ? 50 : steps === 3 ? 100 : ""} />
                </div>
                <Form {...(steps === 1 ? firstForm : secondForm)} >
                    <form onSubmit={steps === 1 ? firstForm.handleSubmit(handleFirstStepSubmit) : secondForm.handleSubmit(handleSecondStepSubmit)} className="space-y-4 w-full">
                        {steps === 1 &&
                            <>
                                <Error message={error} />
                                <FormField
                                    control={firstForm.control}
                                    name="coin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Coins</FormLabel>
                                            <Select onValueChange={value => {
                                                field.onChange(value);
                                            }} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a coin" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {selectData.map((coin) => {
                                                        return (
                                                            <SelectItem key={coin.symbol} value={coin.id}><div className="flex items-center"><img src={coin.image} className="mr-2" width={24} height={24}></img>{coin.name}</div></SelectItem>
                                                        )
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Select a coin and valid to go next step
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">Next Step</Button>
                            </>}
                        {steps >= 2 &&
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1">
                                    <Error message={error} />
                                    <FormField
                                        control={secondForm.control}
                                        name="quantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantité</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="1.00" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <FormField
                                        control={secondForm.control}
                                        name="price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prix par monnaie</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="1.00" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <FormField
                                        control={secondForm.control}
                                        name="spent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Total dépensé</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <FormField
                                        control={secondForm.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Date</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant={"outline"}
                                                                className={cn(
                                                                    "w-[240px] pl-3 text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    format(field.value, "PPP")
                                                                ) : (
                                                                    <span>Pick a date</span>
                                                                )}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={(date) =>
                                                                date > new Date() || date < new Date("1900-01-01")
                                                            }
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="md:col-span-1 col-span-2">
                                    <Button variant="outline" type="button" onClick={() => setSteps(steps - 1)} disabled={steps === 3} className="w-full">Revenir en arrière</Button>
                                </div>
                                <div className="md:col-span-1 col-span-2">
                                    {steps === 2 &&
                                        <Button type="submit" className="w-full">
                                            {id ? (name ? "Modifier la transaction" : "Ajouter une transaction") : "Ajouter une transaction"}
                                        </Button>}
                                    {steps === 3 && <Button type="submit" disabled={true} className="w-full">
                                        <svg className="animate-spin h-5 w-5 mr-3 border-gray-200 border-2 border-t-blue-600 rounded-full" viewBox="0 0 24 24">
                                        </svg>
                                        Loading...
                                    </Button>}
                                </div>
                            </div>
                        }
                    </form>
                </Form >
            </div>
        </div >
    )
}

